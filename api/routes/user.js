const express = require('express');
const User = require('../models/user');

const router = express.Router();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const {loginRules, registerRules, validation, UpdateRules} = require('../middleware/validator');
const isAuth = require('../middleware/passport');

router.post("/register", registerRules(), validation, async (request, result) => {
    try {
        const search = await User.findOne({ username: request.body.username });
        if (search) {
            return result.status(400).send({error :'username already exists'});
        }
        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(request.body.password, genSalt);		

        let newUser = new User({
            ...request.body,
            password: hashed_password
        });

        let res = await newUser.save();

		const payload = {
			username: res.username
		}
		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '7d'
		});
        
        result.status(200).send({ user: res, msg: "user added", token: `bearer ${token}` });
   

    } catch (error) {
        console.error(error);
        result.status(500).send({error :'Something went wrong'});
    }
});

router.post('/login', loginRules(), validation, async (request, result) => {
    const { username, password } = request.body;
    try {

        const searchedUser = await User.findOne({ username });
        if (!searchedUser) {
            result.status(500).send({error: "User not found"});
            return;
        }


        const match = await bcrypt.compare(password, searchedUser.password);

        if (!match) {
            result.status(500).send({error: "Invalid credentials"});
            return;
        }       

		const payload = {
			username: searchedUser.username
		}
		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '7d'
		});        
        result.status(200).send({ user: searchedUser, msg: 'User logged in successfully', token: `bearer ${token}` });
    } catch (error) {
        console.error("Error during login:", error);
        result.status(500).send({error: "Login Failed"});
    }
});

router.get('/generate', async (req, res) => {
    const { id } = req.query;
    try {
        const search = await User.findOne({ _id: id });
        if (!search) return res.status(404).send({ error: 'User not found' });
        const payload = { username: search.username };
        const token = await jwt.sign(payload, process.env.SCTY_KEY, { expiresIn: '7d' });
        res.status(200).send({ token: `bearer ${token}` });
    } catch (error) {
        res.status(500).send({ error: 'Internal server error' });
    }
});

router.get('/current', isAuth(), (request, result) => {    
    result.status(200).send({user: request.user});
});


module.exports = router;