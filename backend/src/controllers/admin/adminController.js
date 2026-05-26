const adminService = require('../../services/adminService');
const { success, fail } = require('../../utils/response');

exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json(fail(400, '用户名和密码不能为空'));
    }
    const data = adminService.login(username, password);
    res.json(success(data, '登录成功'));
  } catch (err) {
    res.status(401).json(fail(401, err.message));
  }
};
