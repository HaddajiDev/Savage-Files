const express = require('express');
const User = require('../models/user');
const crypto = require('crypto');

const router = express.Router();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const {loginRules, registerRules, validation, UpdateRules} = require('../middleware/validator');
const isAuth = require('../middleware/passport');
const { send } = require('process');
const pending = require('../models/pending');
const { sendVerificationEmail, sendPasswordResetEmail, sendConformationNewEmail } = require('../lib/sendEmail');

router.post("/register", registerRules(), validation, async (request, result) => {
    try {
        const search = await User.findOne({ username: request.body.username });
        if (search) {
            return result.status(400).send({error :'username already exists'});
        }
        const emailSearch = await User.findOne({ email: request.body.email });
        if (emailSearch) {
            return result.status(400).send({error :'email already exists'});
        }
        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(request.body.password, genSalt);		

        let newUser = new User({
            ...request.body,
            password: hashed_password,
            verified: false
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
        const searchedUser = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });
        
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
        result.status(200).send({ 
            user: searchedUser, 
            msg: 'User logged in successfully', 
            token: `bearer ${token}` 
        });
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

// register
router.post('/send/add-email', async (req, res) => {
    try {
        const { email, username, password } = req.body;

        const search = await User.findOne({ username: username });
        if (search) {
            return res.send({error :'username already exists'});
        }
        const emailSearch = await User.findOne({ email: email });
        if (emailSearch) {
            return res.send({error :'email already exists'});
        }

        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(password, genSalt);

        let newUser = new User({
            email: email,
            username: username,
            password: hashed_password,
            verified: false
        });

        let result = await newUser.save();

        const payload = {
            userId: result._id,
            email: email,
			username: username
		}

		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '24h'
		});
        
        await sendVerificationEmail(email, username, token);

        const pendingUser = new pending({
            userId: result._id,
            email: email,
            token: token
        });
        await pendingUser.save();

        const payloadLogin = {
			username: username
		}
		const tokenLogin = await jwt.sign(payloadLogin, process.env.SCTY_KEY, {
			expiresIn: '7d'
		});

        res.status(200).send({ user: result, msg: "user added", token: `bearer ${tokenLogin}` });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Error' });
    }
});

// verify email
router.get('/confirm/add-email/:token', async (req, res) => {
    try {
        const decoded = jwt.verify(
            req.params.token,
            process.env.SCTY_KEY
        );

        const user = await User.findById(decoded.userId);
        const pendingEntry = await pending.findOne({ userId: decoded.userId });

        if (!user || !pendingEntry) {
            return res.status(400).send({ error: 'Invalid or expired verification link' });
        }
        
        await User.findByIdAndUpdate(decoded.userId, { email: pendingEntry.email });
        await User.findByIdAndUpdate(decoded.userId, { verified: true });
        await User.findByIdAndUpdate(decoded.userId, { emailVerified: true });
        await pendingEntry.deleteOne();

        res.redirect(process.env.FRONTLINK + '/profile');

    } catch (error) {
        console.error('Error confirming email:', error);
        res.status(500).send({ error: 'Failed to confirm email' });
    }
});

// resend verification email
router.post("/resend/verification", isAuth(), async (req, res) => {
    try {
        
        const payload = {
            userId: req.user._id,
            email: req.user.email,
			username: req.user.username
		}

		const token = await jwt.sign(payload, process.env.SCTY_KEY, {
			expiresIn: '24h'
		});

        await pending.deleteOne({ userId: req.user._id }); 
        
        await sendVerificationEmail(req.user.email, req.user.username, token);

        const pendingUser = new pending({
            userId: req.user._id,
            email: req.user.email,
            token: token
        });
        await pendingUser.save();

        res.send({ 
            message: 'Verification email resent successfully' 
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Error' });
    }
})

// if password is not forgotten
router.put('/update-password', isAuth(), async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;        

        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).send({ error: 'Old password is incorrect' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(userId, { password: hashedPassword });
        res.status(200).send({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).send({ error: 'Failed to update password' });
    }
});

//forgot password
router.post('/reset-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = jwt.sign(
            { userId: user._id },
            process.env.SCTY_KEY,
            { expiresIn: '1h' }
        );

        await sendPasswordResetEmail(
            email,
            user.username,
            token
        );

        res.send({ 
            message: 'Password reset email sent successfully' 
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to send reset email' });
    }
});

// if password is forgotten
router.post('/set-new-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = jwt.verify(
            token,
            process.env.SCTY_KEY
        );
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(404).send({ error: 'Invalid or expired reset link' });
        }
        const salt = 10;
        const genSalt = await bcrypt.genSalt(salt);
        const hashed_password = await bcrypt.hash(newPassword, genSalt);

        user.password = hashed_password;
        await user.save();

        res.send("Mrigl");
    } catch (error) {
        console.error('Set new password error:', error);
        res.status(500).send({ error: 'Failed to reset password' });
    }
});

//email link to reset password
router.get('/verify-reset', async (req, res) => {
    try {
        const { token } = req.query;

        const decoded = jwt.verify(
            token,
            process.env.SCTY_KEY
        );

        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(404).send({ error: 'Invalid or expired reset link' });
        }

        res.redirect(process.env.FRONTLINK + `/reset-password-form?token=${token}`);

    } catch (error) {
        console.error('Verify reset error:', error);
        res.send('Failed to verify token');
    }
});


// send verify new email
router.post('/send/verify-new-email', isAuth(), async (req, res) => {
    try {
        const {newEmail } = req.body;
        const emailSearch = await User.findOne({ email: newEmail });
        if (emailSearch) {
            return res.send({error :'email already exists'});
        }

        const payload = {
            userId: req.user._id,
            email: newEmail,
            username: req.user.username
        }
        const token = await jwt.sign(payload, process.env.SCTY_KEY, {
            expiresIn: '24h'
        });

        await sendConformationNewEmail(newEmail, req.user.username, token);

        res.send({ 
            message: 'Verification email sent successfully' 
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Error' });
    }
});

router.get('/verify-new-email', async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = jwt.verify(
            token,
            process.env.SCTY_KEY
        );
        const id = decoded.userId;
        await User.findByIdAndUpdate(id, { email: decoded.email });
        await User.findByIdAndUpdate(id, { emailVerified: true });
        res.redirect(process.env.FRONTLINK + '/profile');
    } catch (error) {
        console.error('Error confirming new email:', error);
        res.status(500).send({ error: 'Failed to confirm new email' });
    }
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
    return 'BO7-' + crypto.randomBytes(32).toString('hex');
}

module.exports = router;