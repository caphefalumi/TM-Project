import Account from '../models/Account.js'
import bcrypt from 'bcrypt'

const getUserIDAndEmailByName = async (req, res) => {
  const { username } = req.params
  console.log('Username:', username)
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }

  try {
    const account = await Account.findOne({ username })
    if (!account) {
      return res.status(404).json({ error: 'User not found' })
    }
    return res.status(200).json({
      userId: account._id,
      email: account.email,
      success: 'User found',
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// This is only called when user submit forms in OAuth for registration / login
// Returns message for Gmail OAuth

const oAuthentication = async (req, res) => {
  const { email } = req.body
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const existingUser = await Account.findOne({ email })
  console.log(existingUser)
  if (!existingUser) {
    // No user --> require username for register
    return res.status(202).json({ success: 'register' })
  } else {
    // Has user --> authorize
    return res.status(202).json({ success: 'login', username: existingUser.username })
  }
}

// ####################################################################################

const oAuthenticationRegister = async (req, res) => {
  const { username, email } = req.body
  const provider = 'google'
  console.log(username, email)
  if (!username) {
    return res.status(400).json({ error: 'Username is required' })
  }
  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  console.log(existingUser)
  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(400).json({ error: 'Username already exists.' })
    } else if (existingUser.email === email) {
      // double check: If the email is created
      // and the user is able to move on to the second phase: input username only
      // --> Could be duplicated if we dont check email
      return res.status(400).json({ error: 'Email already exists.' })
    }
  }
  console.log('Existing user test passed')
  try {
    const account = new Account({ username, email, provider })
    // console.log(crypto.createHash('sha256').update())
    await account.save()
    res.status(201).json({ success: 'Account created successfully.' })
  } catch (err) {
    res.status(400).json({ error: err })
  }
}

const localRegister = async (req, res) => {
  const { username, email, password } = req.body
  const provider = 'local'

  // 1. Validate input
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  // 2. Check for unique username and email
  const existingUser = await Account.findOne({ $or: [{ username }, { email }] })
  if (existingUser) {
    if (existingUser.username === username) {
      return res.status(400).json({ error: 'Username already exists.' })
    }
    if (existingUser.email === email) {
      return res.status(400).json({ error: 'Email already exists.' })
    }
  }

  // 3. Create and save account (password will be hashed by pre-save hook)
  try {
    const account = new Account({ username, email, password, provider })
    await account.save()
    res.status(201).json({ success: 'Account created successfully.' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

const localLogin = async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  const account = await Account.findOne({ username, provider: 'local' })
  if (!account) {
    // console.log("No Account")
    return res.status(400).json({ error: 'Invalid username or password' })
  }

  const isMatch = await bcrypt.compare(password, account.password)
  if (!isMatch) {
    return res.status(400).json({ error: 'Invalid username or password' })
  } else {
    // console.log('Matched!')
    return res.status(201).json({ success: 'User is authorized' })
  }
}

export default {
  getUserIDAndEmailByName,
  oAuthentication,
  oAuthenticationRegister,
  localRegister,
  localLogin,
}
