/**
 * Huffman Coding Implementation for Message Compression
 * Provides lossless compression for text messages to reduce storage and bandwidth
 */

interface HuffmanNode {
  char: string | null;
  frequency: number;
  left: HuffmanNode | null;
  right: HuffmanNode | null;
}

interface CompressionResult {
  compressedData: string;
  tree: string; // Serialized tree for decompression
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export class HuffmanCompressor {
  /**
   * Compress a text message using Huffman coding
   */
  static compress(text: string): CompressionResult {
    if (!text || text.length === 0) {
      return {
        compressedData: '',
        tree: '',
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 1
      };
    }

    // Don't compress very short messages (overhead not worth it)
    if (text.length < 20) {
      return {
        compressedData: text,
        tree: '',
        originalSize: text.length,
        compressedSize: text.length,
        compressionRatio: 1
      };
    }

    // Build frequency table
    const frequencyMap = this.buildFrequencyMap(text);
    
    // Build Huffman tree
    const root = this.buildHuffmanTree(frequencyMap);
    
    // Generate codes
    const codes = this.generateCodes(root);
    
    // Compress the text
    let compressedBits = '';
    for (const char of text) {
      compressedBits += codes[char] || '';
    }
    
    // Convert bits to base64 for storage
    const compressedData = this.bitsToBase64(compressedBits);
    
    // Serialize tree for decompression
    const serializedTree = this.serializeTree(root);
    
    const originalSize = text.length;
    const compressedSize = compressedData.length + serializedTree.length;
    const compressionRatio = originalSize / compressedSize;

    return {
      compressedData,
      tree: serializedTree,
      originalSize,
      compressedSize,
      compressionRatio
    };
  }

  /**
   * Decompress a Huffman-compressed message
   */
  static decompress(compressedData: string, serializedTree: string): string {
    if (!compressedData || !serializedTree) {
      return compressedData; // Return as-is if not compressed
    }

    try {
      // Deserialize tree
      const root = this.deserializeTree(serializedTree);
      
      // Convert base64 back to bits
      const bits = this.base64ToBits(compressedData);
      
      // Decompress using tree
      return this.decompressWithTree(bits, root);
    } catch (error) {
      console.error('Decompression failed:', error);
      return compressedData; // Return original if decompression fails
    }
  }

  /**
   * Build frequency map of characters
   */
  private static buildFrequencyMap(text: string): Map<string, number> {
    const frequencyMap = new Map<string, number>();
    
    for (const char of text) {
      frequencyMap.set(char, (frequencyMap.get(char) || 0) + 1);
    }
    
    return frequencyMap;
  }

  /**
   * Build Huffman tree from frequency map
   */
  private static buildHuffmanTree(frequencyMap: Map<string, number>): HuffmanNode {
    // Create priority queue (min-heap) of nodes
    const nodes: HuffmanNode[] = Array.from(frequencyMap.entries()).map(([char, freq]) => ({
      char,
      frequency: freq,
      left: null,
      right: null
    }));

    // Sort by frequency (min-heap)
    nodes.sort((a, b) => a.frequency - b.frequency);

    // Build tree
    while (nodes.length > 1) {
      const left = nodes.shift()!;
      const right = nodes.shift()!;
      
      const merged: HuffmanNode = {
        char: null,
        frequency: left.frequency + right.frequency,
        left,
        right
      };
      
      // Insert in sorted position
      let insertIndex = 0;
      while (insertIndex < nodes.length && nodes[insertIndex].frequency < merged.frequency) {
        insertIndex++;
      }
      nodes.splice(insertIndex, 0, merged);
    }

    return nodes[0];
  }

  /**
   * Generate Huffman codes for each character
   */
  private static generateCodes(root: HuffmanNode): Record<string, string> {
    const codes: Record<string, string> = {};
    
    if (!root) return codes;
    
    // Special case: single character
    if (root.char !== null) {
      codes[root.char] = '0';
      return codes;
    }
    
    this.generateCodesRecursive(root, '', codes);
    return codes;
  }

  /**
   * Recursive helper for code generation
   */
  private static generateCodesRecursive(node: HuffmanNode, code: string, codes: Record<string, string>): void {
    if (node.char !== null) {
      codes[node.char] = code || '0'; // Handle root-only case
      return;
    }
    
    if (node.left) {
      this.generateCodesRecursive(node.left, code + '0', codes);
    }
    if (node.right) {
      this.generateCodesRecursive(node.right, code + '1', codes);
    }
  }

  /**
   * Convert bit string to base64 for storage
   */
  private static bitsToBase64(bits: string): string {
    // Pad bits to make length multiple of 8
    const paddedBits = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0');
    
    // Convert to bytes
    const bytes: number[] = [];
    for (let i = 0; i < paddedBits.length; i += 8) {
      const byte = paddedBits.substr(i, 8);
      bytes.push(parseInt(byte, 2));
    }
    
    // Convert to base64
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Convert base64 back to bit string
   */
  private static base64ToBits(base64: string): string {
    const buffer = Buffer.from(base64, 'base64');
    let bits = '';
    
    for (const byte of buffer) {
      bits += byte.toString(2).padStart(8, '0');
    }
    
    return bits;
  }

  /**
   * Serialize Huffman tree for storage
   */
  private static serializeTree(node: HuffmanNode | null): string {
    if (!node) return 'null';
    
    if (node.char !== null) {
      // Leaf node - encode character safely
      return `L:${encodeURIComponent(node.char)}`;
    }
    
    // Internal node
    const left = this.serializeTree(node.left);
    const right = this.serializeTree(node.right);
    return `I:${left}|${right}`;
  }

  /**
   * Deserialize tree from string
   */
  private static deserializeTree(serialized: string): HuffmanNode {
    if (serialized === 'null') {
      throw new Error('Invalid tree data');
    }
    
    if (serialized.startsWith('L:')) {
      // Leaf node
      const char = decodeURIComponent(serialized.substring(2));
      return {
        char,
        frequency: 0, // Not needed for decompression
        left: null,
        right: null
      };
    }
    
    if (serialized.startsWith('I:')) {
      // Internal node
      const content = serialized.substring(2);
      const parts = this.splitTreeParts(content);
      
      return {
        char: null,
        frequency: 0,
        left: this.deserializeTree(parts[0]),
        right: this.deserializeTree(parts[1])
      };
    }
    
    throw new Error('Invalid tree format');
  }

  /**
   * Split serialized tree parts correctly (handling nested structures)
   */
  private static splitTreeParts(content: string): [string, string] {
    let depth = 0;
    let splitIndex = -1;
    
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '|' && depth === 0) {
        splitIndex = i;
        break;
      }
      if (content.substr(i, 2) === 'I:') {
        depth++;
      }
      if (content[i] === '|') {
        depth--;
      }
    }
    
    if (splitIndex === -1) {
      throw new Error('Invalid tree structure');
    }
    
    return [content.substring(0, splitIndex), content.substring(splitIndex + 1)];
  }

  /**
   * Decompress bits using Huffman tree
   */
  private static decompressWithTree(bits: string, root: HuffmanNode): string {
    if (!root) return '';
    
    let result = '';
    let currentNode = root;
    
    for (const bit of bits) {
      if (currentNode.char !== null) {
        // Leaf node - output character and reset
        result += currentNode.char;
        currentNode = root;
      }
      
      // Navigate tree
      if (bit === '0' && currentNode.left) {
        currentNode = currentNode.left;
      } else if (bit === '1' && currentNode.right) {
        currentNode = currentNode.right;
      }
    }
    
    // Handle final character
    if (currentNode.char !== null) {
      result += currentNode.char;
    }
    
    return result;
  }

  /**
   * Get compression statistics for a text
   */
  static getCompressionStats(text: string): {
    originalSize: number;
    estimatedCompressedSize: number;
    estimatedRatio: number;
    worthCompressing: boolean;
  } {
    const originalSize = text.length;
    
    if (originalSize < 20) {
      return {
        originalSize,
        estimatedCompressedSize: originalSize,
        estimatedRatio: 1,
        worthCompressing: false
      };
    }
    
    // Quick estimation based on character frequency
    const frequencyMap = this.buildFrequencyMap(text);
    const uniqueChars = frequencyMap.size;
    
    // Estimate bits per character (rough approximation)
    const avgBitsPerChar = Math.log2(uniqueChars) + 1;
    const estimatedBits = text.length * avgBitsPerChar;
    const estimatedBytes = Math.ceil(estimatedBits / 8);
    
    // Add tree overhead estimate
    const treeOverhead = uniqueChars * 10; // Rough estimate
    const estimatedCompressedSize = estimatedBytes + treeOverhead;
    
    const estimatedRatio = originalSize / estimatedCompressedSize;
    const worthCompressing = estimatedRatio > 1.2; // At least 20% compression
    
    return {
      originalSize,
      estimatedCompressedSize,
      estimatedRatio,
      worthCompressing
    };
  }
}