const express = require('express');
const User = require('../models/user');
const crypto = require('crypto');

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
            result.status(400).send({error: "User not found"});
            return;
        }

        const match = await bcrypt.compare(password, searchedUser.password);

        if (!match) {
            result.status(400).send({error: "Invalid credentials"});
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

router.post('/api-key/generate', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        
        if (!userId) {
            return res.status(400).send({ error: 'User ID not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        const apiKey = generateApiKey();
        
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            { apiKey: apiKey },
            { new: true }
        );

        res.status(200).send({ 
            success: true,
            apiKey: apiKey,
            message: 'API key generated successfully' 
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).send({ error: 'Failed to generate API key' });
    }
});

router.get('/api-key/:userId', isAuth(), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.user._id.toString() !== userId) {
            return res.status(403).send({ error: 'Access denied' });
        }
        
        const user = await User.findById(userId).select('apiKey');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.status(200).send({ 
            success: true,
            apiKey: user.apiKey || null 
        });

    } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).send({ error: 'Failed to fetch API key' });
    }
});

router.delete('/api-key/:userId', isAuth(), async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (req.user._id.toString() !== userId) {
            return res.status(403).send({ error: 'Access denied' });
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        await User.findByIdAndUpdate(userId, { $unset: { apiKey: 1 } });

        res.status(200).send({ 
            success: true,
            message: 'API key revoked successfully' 
        });

    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).send({ error: 'Failed to revoke API key' });
    }
});

router.post('/api-key', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        const apiKey = generateApiKey();
        
        await User.findByIdAndUpdate(userId, { apiKey: apiKey });

        res.status(200).send({ 
            success: true,
            apiKey: apiKey,
            message: 'API key generated successfully' 
        });

    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).send({ error: 'Failed to generate API key' });
    }
});

router.get('/api-key', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        
        const user = await User.findById(userId).select('apiKey');
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        res.status(200).send({ 
            success: true,
            apiKey: user.apiKey || null 
        });

    } catch (error) {
        console.error('Error fetching API key:', error);
        res.status(500).send({ error: 'Failed to fetch API key' });
    }
});

router.delete('/api-key', isAuth(), async (req, res) => {
    try {
        const userId = req.user._id;
        
        await User.findByIdAndUpdate(userId, { $unset: { apiKey: 1 } });

        res.status(200).send({ 
            success: true,
            message: 'API key revoked successfully' 
        });

    } catch (error) {
        console.error('Error revoking API key:', error);
        res.status(500).send({ error: 'Failed to revoke API key' });
    }
});

function generateApiKey() {
    return 'sk-' + crypto.randomBytes(32).toString('hex');
}

module.exports = router;