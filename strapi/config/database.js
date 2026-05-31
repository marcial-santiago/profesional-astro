const path = require('path');

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', env('DATABASE_URL') ? 'postgres' : 'sqlite');

  if (client === 'sqlite') {
    return {
      connection: {
        client: 'sqlite',
        connection: {
          filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
        },
        useNullAsDefault: true,
        debug: false,
      },
    };
  }

  const useSSL = env('DATABASE_SSL', 'true') === 'true';
  const hasExplicitConnection = Boolean(env('DATABASE_HOST'));
  const connection =
    env('DATABASE_URL') && !hasExplicitConnection
      ? { connectionString: env('DATABASE_URL') }
      : {
          host: env('DATABASE_HOST', 'localhost'),
          port: env.int('DATABASE_PORT', 5432),
          database: env('DATABASE_NAME', 'profesional_astro'),
          user: env('DATABASE_USERNAME', 'postgres'),
          password: env('DATABASE_PASSWORD'),
        };

  return {
    connection: {
      client: 'postgres',
      connection: {
        ...connection,
        ...(useSSL && { ssl: { rejectUnauthorized: false } }),
      },
      debug: false,
    },
  };
};
