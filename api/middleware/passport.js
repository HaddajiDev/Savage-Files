const User = require("../models/user");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const passport = require("passport");
const { isPurpose, PURPOSES } = require("../lib/tokens");

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.SCTY_KEY,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      if (!isPurpose(jwt_payload, PURPOSES.AUTH)) return done(null, false);
      const user = await User.findOne({ username: jwt_payload.username });
      return user ? done(null, user) : done(null, false);
    } catch (error) {
      console.error(error);
      return done(error, false);
    }
  })
);

const isAuth = () => passport.authenticate("jwt", { session: false });

const requireVerified = (req, res, next) => {
  if (!req.user?.verified) {
    return res.status(403).send({ error: "Please verify your email first" });
  }
  next();
};

module.exports = isAuth;
module.exports.requireVerified = requireVerified;
