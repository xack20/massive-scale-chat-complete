import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'file-service' },
  transports: [new winston.transports.Console()]
});
