const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Role = require('../models/Role.model');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);

  try {
    const user = await User.findOne({ email }).populate('role');
    console.log('User found:', user ? user.email : 'not found');

    if (user && (await user.matchPassword(password))) {
      console.log('Password matched');
      const token = generateToken(user._id);
      console.log('Token generated');
      
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token,
      });
    } else {
      console.log('Invalid credentials');
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('role');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Update user profile
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.mobile = req.body.mobile || user.mobile;
      if (req.body.profileImage) {
        user.profileImage = req.body.profileImage;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      const populatedUser = await User.findById(updatedUser._id).populate('role');

      res.json({
        _id: populatedUser._id,
        name: populatedUser.name,
        email: populatedUser.email,
        mobile: populatedUser.mobile,
        profileImage: populatedUser.profileImage,
        role: populatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
