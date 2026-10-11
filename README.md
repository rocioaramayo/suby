# Suby | Plataforma de subastas en tiempo real

Aplicación móvil de subastas desarrollada como proyecto académico. Permite gestionar usuarios, lotes, ofertas y notificaciones mediante una arquitectura cliente-servidor.

## Tecnologías

| Área | Tecnologías |
| --- | --- |
| Frontend móvil | React Native, Expo, TypeScript |
| Backend | Java, Spring Boot |
| API y seguridad | REST API, JWT |
| Base de datos | SQL Server |

## Funcionalidades principales

- Registro e inicio de sesión de usuarios.
- Autenticación basada en JWT.
- Gestión de lotes y subastas.
- Registro de ofertas.
- Gestión de notificaciones.
- Comunicación entre la aplicación móvil y una API REST.

## Estructura del repositorio

```text
suby/
├── front_suby-main/   # Aplicación móvil con React Native + Expo
└── suby-back/         # API REST con Java + Spring Boot
```

## Ejecución del frontend

```bash
cd front_suby-main
npm install
npx expo start
```

> Para ejecutar la solución completa se requiere levantar el backend y configurar la conexión a SQL Server según el entorno local.

## Contexto

Proyecto académico desarrollado en equipo como práctica de desarrollo full stack, diseño de APIs, persistencia de datos y autenticación.
