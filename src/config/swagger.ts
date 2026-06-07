// src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Meeting Intelligence Service API',
      version: '1.0.0',
      description:
        'A backend service that stores meeting transcripts, generates AI-powered insights with citations, and tracks action items with automated reminders.',
      contact: {
        name: env.CANDIDATE_NAME,
        email: env.CANDIDATE_EMAIL,
      },
    },
    servers: [
      {
        url: env.NODE_ENV === 'production' ? env.DEPLOYED_URL : `http://localhost:${env.PORT}`,
        description: env.NODE_ENV === 'production' ? 'Production' : 'Local Development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            traceId: { type: 'string', example: 'abc123-uuid' },
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            traceId: { type: 'string', example: 'abc123-uuid' },
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Meeting title is required' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/**/*.routes.ts', './src/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
