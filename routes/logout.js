const express = require('express');
const router = express.Router();

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: "Erro ao fazer logout." });
    }
    res.redirect('/login');
  });
});

module.exports = router;
