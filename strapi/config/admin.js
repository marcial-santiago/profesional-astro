module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'dev-jwt-secret-123'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'dev-salt-123'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'dev-transfer-salt-123'),
    },
  },
  jwt: {
    secret: env('JWT_SECRET', 'dev-jwt-secret-456'),
  },
});
