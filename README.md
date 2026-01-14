# Guía de instalación y configuración

## 1. Instalar dependencias

Ejecutar el siguiente comando para instalar los paquetes necesarios:

```bash
pnpm i
```

````

---

## 2. Configuración de variables de entorno

Copiar el archivo `example.env` y renombrarlo como `.env`.
Luego, completar los valores requeridos dentro de `.env`.

---

## 3. Base de datos con Docker

Levantar el contenedor de la base de datos con:

```bash
docker compose up -d
```

---

## 4. Alternativa de conexión

En lugar de usar Docker, se puede configurar la URI de conexión hacia:
DATABASE_URL=

- Una instancia de **Supabase**
- Una base de datos en **Neon**
- Una base de datos local ya existente

---

## 5. Sincronizar Prisma

Ejecutar el siguiente comando para aplicar el esquema de Prisma en la base de datos:

```bash
pnpm prisma db push
```

---

## ✅ Resultado

Con estos pasos, la aplicación queda conectada a la base de datos y lista para funcionar.

```
````
