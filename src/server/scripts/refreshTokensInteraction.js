import connectDB from '../config/db.js';
import RefreshToken from '../models/RefreshToken.js'
import jwt from 'jsonwebtoken'
import JWTAuth from '../verify/JWTAuth.js'

const {
    generateRefreshToken, verifyToken
} = JWTAuth

// test purposes only

async function addRefreshToken(userId, username, email){
    await connectDB()

    const user = {
        _id: userId,
        username: username,
        email: email
    }
    const token = generateRefreshToken(user)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day

    const storedRefreshToken = await RefreshToken.create({
        userId: userId, 
        token: token, 
        username: username, 
        email: email, 
        expiresAt: expiresAt
    })
    await storedRefreshToken.save()

    console.log("Refresh Token created:", storedRefreshToken)
}

async function verifyRefreshToken(userId){
    await connectDB()
    const storedRefreshToken = await RefreshToken.findOne({userId: userId})
    const userToken = storedRefreshToken.token
    jwt.verify(userToken, process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
        if(err) {
            console.log(err)
        }
        else {
            console.log(payload)
        }
    })
}

async function deleteRefreshToken(userId){
    await connectDB()
    const storedRefreshToken = await RefreshToken.findOne({userId: userId})
    if(!storedRefreshToken) {
        console.log("No Refresh Token found for userId:", userId)
        return 
    }
    if(storedRefreshToken.expiresAt < new Date()){
        console.log("Refresh Token expired, deleting...")
        await RefreshToken.deleteOne({userId: userId})
    } else {
        console.log("Refresh Token is still valid, not deleting.")
    }
}
// addRefreshToken("684e69d04b8cfb8924086091", "khanhdeptrai123", "khanhdeptrai123@gmail.com")
// addRefreshToken("684fc94f3bbf927959c41d3f", "Hồ Quốc Khánh", "khanhkelvin08122006@gmail.com")

// verifyRefreshToken("684e69d04b8cfb8924086091")
// verifyRefreshToken("684fc94f3bbf927959c41d3f")

//deleteRefreshToken("684e69d04b8cfb8924086091", "khanhdeptrai123", "khanhdeptrai123@gmail.com")
deleteRefreshToken("684fc94f3bbf927959c41d3f", "Hồ Quốc Khánh", "khanhkelvin08122006@gmail.com")