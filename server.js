const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2');
const path = require('path');

const app = express();
const PORT = 3000;

// Configurar conexión a MySQL
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Tomatoide2025', 
  database: 'bitacora_desfibriladores'
});

connection.connect(err => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('✅ Conexión exitosa a la base de datos bitácora desfibriladores.');
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false
}));

// Verifica si hay sesión iniciada
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

//Middleware de roles
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session.user || {
      tipo_usuario: req.session.tipo_usuario
    };

    // Si no hay usuario en sesión
    if (!user) {
      return res.redirect('/login.html');
    }

    // Si es administrador (1), siempre tiene acceso
    if (user.tipo_usuario === '1' || allowedRoles.includes(user.tipo_usuario)) {
      return next();
    }

    // Si no está permitido
    return res.send(`
      <html>
        <head><link rel="stylesheet" href="/styles.css"><title>Error</title></head>
        <body>
          <h2>Acceso denegado.</h2>
          <div class="logout-wrapper">
            <button3 onclick="window.location.href='/'">Volver</button3>
          </div>
        </body>
      </html>
    `);
  };
}

//Redirigir automáticamente al login si no hay sesión
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  // Si hay sesión, redirigir a la página principal protegida
  res.redirect('/index.html');
});

// Proteger el acceso directo al index.html
app.get('/index.html', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// API para obtener datos del usuario logueado
app.get('/api/session-user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No hay sesión activa" });
  }
  res.json(req.session.user);
});


// Página de gestión de usuarios (protegida)
app.get('/gestionar-usuarios.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'gestionar-usuarios.html'));
});

// Página de creación de usuarios (protegida)
app.get('/usuarios-nuevo.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'usuarios-nuevo.html'));
});

// Ruta para obtener el tipo de usuario actual
app.get('/tipo-usuario', requireLogin, (req, res) => {
    res.json({ tipo_usuario: req.session.user.tipo_usuario });
});

// Registro de usuario
app.post('/registrar', async (req, res) => {
  const { nombre_usuario, password, tipo_usuario } = req.body;

  if (!nombre_usuario || !password || !tipo_usuario) {
    return res.send('Por favor, complete todos los campos.');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, ?)';
    connection.query(query, [nombre_usuario, passwordHash, parseInt(tipo_usuario)], err => {
      if (err) {
        console.error(err);
        return res.send('Error al registrar el usuario.');
      }
      res.redirect('/login.html');
    });
  } catch (error) {
    console.error(error);
    res.send('Error interno al registrar el usuario.');
  }
});

// Inicio de sesión
app.post('/login', (req, res) => {
  const { nombre_usuario, password } = req.body;

  connection.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario], async (err, results) => {
    if (err) {
      console.error(err);
      return res.send('Error en la base de datos.');
    }

    if (results.length === 0) {
      return res.send(`
        <html>
          <head><link rel="stylesheet" href="/styles.css"><title>Error</title></head>
          <body>
            <h2>Usuario no encontrado.</h2>
            <div class="logout-wrapper">
              <button3 onclick="window.location.href='/'">Volver</button3>
            </div>
          </body>
        </html>
      `);
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      return res.send(`
        <html>
          <head><link rel="stylesheet" href="/styles.css"><title>Error</title></head>
          <body>
            <h2>Contraseña incorrecta.</h2>
            <div class="logout-wrapper">
              <button3 onclick="window.location.href='/'">Volver</button3>
            </div>
          </body>
        </html>
      `);
    }

    //Guardar usuario completo en la sesión
    req.session.user = {
      id: user.id,
      nombre_usuario: user.nombre_usuario,
      tipo_usuario: user.tipo_usuario
    };

    console.log('Sesión iniciada:', req.session.user);

    res.redirect('/index.html');
  });
});

// Cerrar sesión con GET
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error cerrando sesión:", err);
      return res.status(500).send("Error al cerrar sesión");
    }
    res.clearCookie('connect.sid'); // opcional: limpiar cookie
    res.redirect('/login.html?logout=success');
  });
});

// Ruta para agregar desfibrilador
app.get('/agregar-desfibrilador.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'agregar-desfibrilador.html'));
});



// Buscar desfibriladores por criterio
app.get('/buscar', (req, res) => {
  const query = req.query.query || '';

  // Si no hay query, devolvemos todos
  let sql = "SELECT * FROM desfibriladores";
  let params = [];

  if (query) {
    sql += ` WHERE area LIKE ? 
             OR marca LIKE ? 
             OR modelo LIKE ? 
             OR numero_serie LIKE ? 
             OR estado LIKE ? 
             OR zona LIKE ?`;
    params = Array(6).fill(`%${query}%`);
  }

  connection.query(sql, params, (err, results) => {
    if (err) {
      console.error("Error en búsqueda:", err);
      return res.status(500).json({ mensaje: "Error en la búsqueda" });
    }
    res.json(results);
  });
});

// Obtener un desfibrilador por ID
app.get('/desfibriladores/:id', (req, res) => {
  const { id } = req.params;

  const sql = "SELECT * FROM desfibriladores WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error al obtener desfibrilador:", err);
      return res.status(500).json({ mensaje: "Error al obtener desfibrilador" });
    }
    if (results.length === 0) {
      return res.status(404).json({ mensaje: "Desfibrilador no encontrado" });
    }
    res.json(results[0]); // devolvemos el objeto único
  });
});

// Obtener todos los desfibriladores
app.get('/desfibriladores', (req, res) => {
  connection.query("SELECT * FROM desfibriladores", (err, results) => {
    if (err) {
      console.error("Error al obtener desfibriladores:", err);
      return res.status(500).json({ mensaje: "Error al obtener desfibriladores" });
    }
    res.json(results);
  });
});


// Añadir un nuevo desfibrilador
app.post('/desfibriladores', (req, res) => {
  const { area, marca, modelo, numero_serie, estado, zona } = req.body;

  if (!area || !marca || !modelo || !numero_serie || !estado || !zona) {
    return res.status(400).json({ mensaje: "Todos los campos son obligatorios" });
  }

  const sql = `
    INSERT INTO desfibriladores (area, marca, modelo, numero_serie, estado, zona) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  connection.query(sql, [area, marca, modelo, numero_serie, estado, zona], (err, result) => {
    if (err) {
      console.error("Error al añadir desfibrilador:", err);
      return res.status(500).json({ mensaje: "Error al añadir desfibrilador" });
    }
    res.json({ mensaje: "Desfibrilador añadido correctamente", id: result.insertId });
  });
});


// Editar desfibrilador por ID
app.put('/desfibriladores/:id', (req, res) => {
  const { id } = req.params;
  const { area, marca, modelo, numero_serie, estado, zona } = req.body;

  const sql = `
    UPDATE desfibriladores 
    SET area = ?, marca = ?, modelo = ?, numero_serie = ?, estado = ?, zona = ?, fecha_modificacion = NOW()
    WHERE id = ?
  `;
  connection.query(sql, [area, marca, modelo, numero_serie, estado, zona, id], (err, result) => {
    if (err) {
      console.error("Error al actualizar desfibrilador:", err);
      return res.status(500).json({ mensaje: "Error al actualizar desfibrilador" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Desfibrilador no encontrado" });
    }
    res.json({ mensaje: "Desfibrilador actualizado correctamente" });
  });
});

// Eliminar desfibrilador por ID
app.delete('/desfibriladores/:id', (req, res) => {
  const { id } = req.params;

  connection.query("DELETE FROM desfibriladores WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar desfibrilador:", err);
      return res.status(500).json({ mensaje: "Error al eliminar desfibrilador" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensaje: "Desfibrilador no encontrado" });
    }
    res.json({ mensaje: "Desfibrilador eliminado correctamente" });
  });
});

//Ver Usuarios
app.get('/ver-usuarios', requireLogin, requireRole('1'), (req, res) => {
  connection.query('SELECT * FROM usuarios', (err, results) => {
    if (err) return res.send('Error al obtener los datos.');

    let html = `
      <html>
        <head><link rel="stylesheet" href="/styles.css">
        <title>Usuarios</title>
        </head>
        <body>
          <h1>Usuarios Registrados</h1>
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre de usuario</th><th>Tipo de usuario</th><th>Editar</th></tr>
            </thead>
            <tbody>
    `;

    results.forEach(p => {
      html += `
      <tr>
      <td>${p.id}</td>
      <td>${p.nombre_usuario}</td>
      <td>${p.tipo_usuario}</td>
      <td><a href="/editar-usuario.html?id=${p.id}">Editar</a></td>
      </tr>`;
    });

    html += `
            </tbody>
          </table>
          <div class="logout-wrapper">
            <button3 onclick="window.location.href='/'">Volver</button3>
          </div>
        </body>
      </html>
    `;
    res.send(html);
  });
});

app.get('/mis-datos.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'mis-datos.html'));
});

app.get('/api/mis-datos', requireLogin, (req, res) => {
  const usuarioId = req.session.user.id;

  const sql = "SELECT nombre_enfermero, apellido, ubicacion FROM enfermeros WHERE id=?";
  connection.query(sql, [usuarioId], (err, results) => {
    if (err) {
      console.error("Error en la base de datos:", err);
      return res.status(500).send("Error en la base de datos");
    }
    if (results.length === 0) return res.json(null);
    res.json(results[0]);
  });
});

app.get('/mis-datos-editar.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'mis-datos-editar.html'));
});

// Mostrar datos del enfermero o formulario vacío
app.get('/mis-datos.html', requireLogin, (req, res) => {
  const usuarioId = req.session.user.id;

  const sql = "SELECT nombre_enfermero, apellido, ubicacion FROM enfermeros WHERE id=?";
  connection.query(sql, [usuarioId], (err, results) => {
    if (err) return res.status(500).send("Error en la base de datos");
    if (results.length === 0) return res.json(null);
    res.json(results[0]);
  });
});

// Guardar o actualizar datos del enfermero
app.post('/mis-datos.html', requireLogin, (req, res) => {
  const usuarioId = req.session.user.id;
  const { nombre_enfermero, apellido, ubicacion } = req.body;

  const sql = `
    INSERT INTO enfermeros (id, nombre_enfermero, apellido, ubicacion)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      nombre_enfermero = VALUES(nombre_enfermero),
      apellido = VALUES(apellido),
      ubicacion = VALUES(ubicacion)
  `;

  connection.query(sql, [usuarioId, nombre_enfermero, apellido, ubicacion], (err) => {
    if (err) return res.status(500).send("Error en la base de datos");
    res.json({ success: true });
  });
});

// Ruta para obtener todos los usuarios en formato JSON
app.get('/api/usuarios', requireLogin, (req, res) => {
  connection.query("SELECT * FROM usuarios", (err, results) => {
    if (err) return res.status(500).send("Error en la base de datos");
    res.json(results); // 👈 devolvemos los usuarios como JSON
  });
});

//Ruta para obtener un usuario en específico
app.get('/api/usuarios/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  connection.query("SELECT * FROM usuarios WHERE id=?", [id], (err, results) => {
    if (err) return res.status(500).send("Error en la base de datos");
    if (results.length === 0) return res.status(404).send("Usuario no encontrado");
    res.json(results[0]); // devuelve solo el usuario con ese id
  });
});


// Crear nuevo usuario
app.post('/api/usuarios', requireLogin, (req, res) => {
  const { nombre_usuario, password, tipo_usuario } = req.body;

  if (!nombre_usuario || !password || !tipo_usuario) {
    return res.status(400).send("Faltan datos");
  }

  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) return res.status(500).send("Error al encriptar contraseña");

    const sql = "INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, ?)";
    connection.query(sql, [nombre_usuario, hash, tipo_usuario], (err, result) => {
      if (err) return res.status(500).send("Error al crear usuario");
      res.json({ id: result.insertId, nombre_usuario, tipo_usuario });
    });
  });
});

// Editar usuario
app.put('/api/usuarios/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const { nombre_usuario, tipo_usuario, password } = req.body;

  if (password) {
    // Si se envió nueva contraseña, la convertimos a hash
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) return res.status(500).send("Error al encriptar contraseña");

      const sql = "UPDATE usuarios SET nombre_usuario=?, password_hash=?, tipo_usuario=? WHERE id=?";
      connection.query(sql, [nombre_usuario, hash, tipo_usuario, id], (err) => {
        if (err) return res.status(500).send("Error al actualizar usuario");
        res.json({ id, nombre_usuario, tipo_usuario });
      });
    });
  } else {
    // Si no se envió contraseña, solo actualizamos nombre_usuario y tipo_usuario
    const sql = "UPDATE usuarios SET nombre_usuario=?, tipo_usuario=? WHERE id=?";
    connection.query(sql, [nombre_usuario, tipo_usuario, id], (err) => {
      if (err) return res.status(500).send("Error al actualizar usuario");
      res.json({ id, nombre_usuario, tipo_usuario });
    });
  }
});


// Eliminar usuario
app.delete('/api/usuarios/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM usuarios WHERE id=?";
  connection.query(sql, [id], (err) => {
    if (err) return res.status(500).send("Error al eliminar usuario");
    res.json({ success: true });
  });
});


//Después de definir las rutas protegidas, recién aquí se sirven los archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

//Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
