# 🏥 Sistema de Gestión de Desfibriladores

Este proyecto es una aplicación web para la **gestión y control de desfibriladores en hospitales**, diseñada para facilitar el trabajo de administradores y enfermeros.  
Incluye funcionalidades de búsqueda, registro, edición y eliminación de desfibriladores, con control de acceso según el rol del usuario.

---

## 🚀 Características principales

- **Autenticación con roles**:
  - 👨‍💼 Administrador: puede añadir, editar y eliminar desfibriladores, además de gestionar usuarios.
  - 👩‍⚕️ Enfermero: puede consultar y editar información de desfibriladores asignados.

- **Gestión de desfibriladores**:
  - Añadir nuevos registros.
  - Editar información existente.
  - Eliminar desfibriladores.
  - Buscar por área, marca, modelo, número de serie, estado o zona.

- **Interfaz amigable**:
  - Construida con **Bootstrap 5** y **Bootstrap Icons**.
  - Tablas dinámicas con badges de estado (Disponible, Mantenimiento, Ocupado).
  - Alertas claras para retroalimentación al usuario.

- **Backend robusto**:
  - API REST con **Node.js + Express**.
  - Base de datos **MySQL** para almacenamiento seguro.
  - Rutas protegidas según sesión y rol.

---

## 📂 Estructura del proyecto

proyecto/ 
├── server.js # Servidor principal con Express 
├── db.js # Conexión a MySQL ├── views/ # Archivos HTML (index, agregar, editar) 
│ ├── index.html 
│ ├── agregar-desfibrilador.html 
│ └── editar-desfibrilador.html 
├── public/ # Recursos estáticos (CSS, JS, imágenes) 
└── README.md # Este archivo

---

