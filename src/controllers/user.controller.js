const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const userService = require('../services/user.service');

const listUsers = asyncHandler(async (req, res) => {
  const { data, meta } = await userService.listUsers(req.query);
  sendSuccess(res, { message: 'Users fetched successfully', data, meta });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body, req.user);
  sendSuccess(res, { statusCode: 201, message: 'User created successfully', data: { user } });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body, req.user);
  sendSuccess(res, { message: 'User updated successfully', data: { user } });
});

const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id, req.user);
  sendSuccess(res, { message: 'User deleted successfully' });
});

module.exports = { listUsers, createUser, updateUser, deleteUser };
