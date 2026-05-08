module.exports = ({ env }) => {
  const useSSL = env('DATABASE_SSL', 'true') === 'true';

  return {
    connection: {
      client: 'postgres',
      connection: {
        connectionString: env('DATABASE_URL'),
        ...(useSSL && { ssl: { rejectUnauthorized: false } }),
      },
      debug: false,
    },
  };
};
