# Glera — Formularios para planes de fin de semana

App para crear formularios que se envían por WhatsApp a las familias de Glera, saber quién se apunta a cada plan y ver las respuestas.

## Cómo funciona

- **Admin** (solo con contraseña): crea formularios con título, imagen de cabecera, descripción del plan con estilos (negrita, listas, colores, tamaños) y preguntas personalizadas. Cada formulario tiene un enlace público y un botón para compartir por WhatsApp.
- **Familias**: abren el enlace desde el grupo de WhatsApp de su hijo, rellenan nombre y apellidos del hijo, si se apunta, observaciones y las preguntas. El nombre se guarda en su móvil para que no tengan que escribirlo cada vez.
- **Admin ve**: cuántos han respondido, cuántos se han apuntado / no, listado con nombres, respuestas y observaciones, exportar a CSV, duplicar, cerrar y borrar.

## Campos fijos en todos los formularios

1. Nombre del hijo
2. Apellidos del hijo
3. ¿Se apunta al plan? (Sí / No)
4. Observaciones (opcional)

A eso el admin añade las preguntas que quiera: texto corto, texto largo, número, Sí/No, una opción (radio), varias opciones (checkbox) o desplegable.

## Guardado de datos

La app usa **Firebase Firestore** si está configurado (mismo sistema que Studio sistema). Sin configuración, funciona en **modo local** (los datos quedan guardados en el navegador donde se crean) para probar.

Para activar el guardado compartido (familias desde distintos móviles + admin) con el proyecto `formularios` (cuenta gabriel.bailly@gmail.com):

1. En Firebase Console (con la cuenta gabriel.bailly@gmail.com) → proyecto `formularios` → **Compilación → Firestore Database → Crear base de datos** → Modo de producción → ubicación `eur3 (europe-west)` → Crear. Las colecciones `glera_forms` y `glera_responses` se crean solas al guardar el primer formulario; no hace falta crearlas a mano.
2. En el mismo proyecto → **Firestore Database → Reglas** → pega el contenido de `firestore.rules` de este repo → **Publicar**.
3. En el mismo proyecto → **Configuración del proyecto → Tus apps → App web** (si no hay, añade una) → copia `firebaseConfig`.
4. En Vercel → proyecto → Settings → Environment Variables, añade:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (= `formularios`)
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_ADMIN_PASSWORD` (contraseña del admin, por defecto `glera2026` si no se pone)
5. Redeploy en Vercel.

Alternativa por terminal (desde esta carpeta, con tu sesión de Firebase): `firebase deploy --only firestore:rules,firestore:indexes` — usa `firebase.json` y `.firebaserc` de este repo, que ya apuntan al proyecto `formularios`.

Sin Firebase, la app avisa arriba con “Modo local”.

## Contraseña admin

Por defecto: `glera2026`. Cámbiala en Vercel con `NEXT_PUBLIC_ADMIN_PASSWORD` y haz Redeploy. El acceso admin no pide cuenta de Google ni registro.

## Desarrollo local

```bash
npm install
npm run dev
```

## Despliegue

- GitHub: este repo.
- Vercel: importar el repo, añadir las variables de entorno de arriba y desplegar. No necesita nada más.

## Privacidad

Solo se guardan nombre y apellidos del hijo, si se apunta, observaciones y respuestas a las preguntas. No se guardan teléfonos ni correos. El nombre se guarda en el propio móvil de la familia (localStorage) para autocompletar futuros formularios.
