const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const clientesRoutes = require('./routes/clientesRoutes');
const vendasRoutes = require('./routes/vendasRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const statsRoutes = require('./routes/statsRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/clientes', clientesRoutes);
app.use('/vendas', vendasRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/', statsRoutes);
app.use('/', pdfRoutes);

module.exports = app;