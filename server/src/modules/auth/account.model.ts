import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const accountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    validate: {
      validator: function (v) {
        // Simple email regex for validation
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v)
      },
      message: (props) => `${props.value} is not a valid email!`,
    },
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
  },
  provider: {
    type: String,
    enum: ['local', 'google'],
    required: true,
  },
  lastUsernameChangeAt: {
    type: Date,
    default: null,
  },
  lastEmailChangeAt: {
    type: Date,
    default: null,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpires: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
})

accountSchema.pre('save', async function (next) {
  // Update the updatedAt field
  this.updatedAt = Date.now()

  // hashing password
  if (!this.isModified('password')) return next()
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err) {
    next(err)
  }
})

const Account = mongoose.model('Account', accountSchema)
export default Account
