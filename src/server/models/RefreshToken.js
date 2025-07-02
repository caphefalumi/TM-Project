import mongoose from 'mongoose'

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: () => Date.now()
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revoked: {
        type: Boolean,
        default: false
    }
})

const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema)
export default RefreshToken