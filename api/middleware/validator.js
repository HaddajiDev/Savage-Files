const {check, validationResult} = require("express-validator");

exports.registerRules = () =>
    [
        check('username', 'username is required').notEmpty(),
        check('username', 'username length 3 - 15').isLength({
            max:15,
            min:3,
        }),
        check('password', 'password is required').notEmpty(),
        check('password', 'password length 3 - 15').isLength({
            min:6,
            max:20
        }),
];


exports.loginRules = () =>
    [
        check('username', 'username is required').notEmpty(),       
        check('password', 'password is required').isLength({
            min:6,
            max:20
        }),
];



exports.validation = (req, res, next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).send({errors: errors.array()});
    }
    next();
}