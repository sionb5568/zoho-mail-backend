const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const Imap = require('imap-simple');
const MailParser = require('mailparser').simpleParser;
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// POST /send — Send email
app.post('/send', async (req, res) => {
  const { to, subject, body } = req.body;

  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com", // 또는 Gmail, Outlook SMTP
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: body
    });
    res.send('Email sent!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to send');
  }
});

// GET /inbox — Receive email
app.get('/inbox', async (req, res) => {
  const config = {
    imap: {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASS,
      host: 'imap.zoho.com', // 또는 imap.gmail.com
      port: 993,
      tls: true,
      authTimeout: 3000
    }
  };

  try {
    const connection = await Imap.connect(config);
    await connection.openBox('INBOX');

    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: [''], markSeen: false };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const parsed = await Promise.all(messages.map(async (item) => {
      const all = item.parts.find(part => part.which === '');
      const parsed = await MailParser(all.body);
      return {
        subject: parsed.subject,
        from: parsed.from.text,
        text: parsed.text
      };
    }));

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).send('IMAP error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
