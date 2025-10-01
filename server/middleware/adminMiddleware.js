export const checkAdminAccess = (req, res, next) => {
  if (req.user && req.user.username === 'admin') {
    return next()
  }

  return res.status(403).json({
    message: 'Access denied. Admin privileges required.',
  })
}

export default {
  checkAdminAccess,
}
