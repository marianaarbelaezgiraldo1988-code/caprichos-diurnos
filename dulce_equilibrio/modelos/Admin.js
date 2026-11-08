const mongoose = require('mongoose');

// Persona con acceso al panel. La contraseña nunca se guarda: solo su hash.
const adminSchema = new mongoose.Schema(
  {
    usuario: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40
    },
    salt: { type: String, required: true },
    hash: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
