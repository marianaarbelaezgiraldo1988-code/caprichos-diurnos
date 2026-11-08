const mongoose = require('mongoose');

const contactoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 120
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 1500
    },
    lugar: {
      type: String,
      enum: ['Medellin', 'Bogota', 'Cali', ''],
      default: ''
    },
    // Lo usa el panel para saber qué mensajes ya se revisaron.
    leido: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contacto', contactoSchema);
