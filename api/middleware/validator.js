const {check, validationResult} = require("express-validator");

exports.registerRules = () =>
    [
        check('username', 'username is required').notEmpty(),
        check('username', 'username length 3 - 15').isLength({
            max:15,
            min:3,
        }),
        check('email', 'valid email is required').trim().isEmail().toLowerCase(),
        check('password', 'password is required').notEmpty(),
        check('password', 'password length 6 - 20').isLength({
            min:6,
            max:20
        }),
];


exports.loginRules = () =>
    [
        check('username', 'Username or email is required').notEmpty(),
        check('password', 'password is required').isLength({
            min:6,
            max:20
        }),
];

exports.newPasswordRules = () =>
    [
        check('newPassword', 'password length 6 - 20').isString().isLength({
            min:6,
            max:20
        }),
];

exports.emailRules = (field) =>
    [
        check(field, 'valid email is required').trim().isEmail().toLowerCase(),
];


exports.validation = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        const list = errors.array();
        return res.status(400).send({error: list[0].msg, errors: list});
    }
    next();
}
