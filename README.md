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

## 6. Configuración de Pagos (Stripe)

### Variables de Entorno Necesarias

Asegúrate de agregar las siguientes variables en tu archivo `.env`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_... (tu clave secreta de Stripe)
STRIPE_WEBHOOK_SECRET=whsec_... (secreto del webhook)
```

### Configuración del Webhook

Para que el sistema de pagos funcione correctamente y cree los registros de visitas automáticamente después de un pago, debes configurar un webhook en tu cuenta de Stripe.

1.  **Inicia sesión en tu Dashboard de Stripe** y ve a la sección de *Developers > Webhooks*.
2.  **Crea un nuevo endpoint**:
    *   **Endpoint URL**: `https://tu-dominio.com/api/stripe/webhook`
    *   *Nota para desarrollo local:* Usa `stripe listen` para simular webhooks localmente:
        ```bash
        stripe listen --forward-to localhost:3000/api/stripe/webhook
        ```
3.  **Selecciona los eventos a escuchar**. Debes seleccionar:
    *   `checkout.session.completed`
4.  **Copia el "Signing Secret"** que Stripe te proporciona al crear el webhook.
5.  **Pega el secreto** en la variable de entorno `STRIPE_WEBHOOK_SECRET` en tu archivo `.env`.

### Flujo del Sistema de Pagos

1.  El usuario selecciona un turno en el agendador.
2.  En la página de checkout, completa sus datos personales (nombre, teléfono, email).
3.  El usuario elige **"Pagar con Stripe"** o **"Solo confirmar turno"**.
4.  **Si paga con Stripe**:
    *   Se crea una sesión de pago con los datos del turno y del usuario guardados en `metadata`.
    *   El usuario completa el pago en Stripe.
    *   Stripe envía un evento `checkout.session.completed` a tu webhook (`/api/stripe/webhook`).
    *   El webhook verifica la firma, extrae los datos de la `metadata` y crea el registro de `Visit` en la base de datos.
5.  **Si confirma sin pago**:
    *   Los datos se envían directamente a `/api/visits` y se crea el registro inmediatamente.

---

## ✅ Resultado

Con estos pasos, la aplicación queda conectada a la base de datos y el sistema de pagos configurado para procesar turnos.

```
````
