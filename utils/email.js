const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Wincres Trust <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    // if (process.env.NODE_ENV === 'production') {
    //   return nodemailer.createTransport({
    //     service: 'gmail',
    //     auth: {
    //       user: process.env.EMAIL_USERNAME,
    //       pass: process.env.EMAIL_PASSWORD,
    //     },
    //   });
    // }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.MAIL_TRAP_EMAIL_USERNAME,
        pass: process.env.MAIL_TRAP_EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    // 1. Render the html based on pug template
    const html = pug.renderFile(`${__dirname}/../views/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2. Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.convert(html),
    };

    // 3. Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendLogin() {
    await this.send('login', 'WINCRES LOGIN NOTIFICATION');
  }

  async sendOTP() {
    await this.send('otp', 'WINCRES TRANSACTION TOKEN (Valid for 3 mins)');
  }

  async sendDebit() {
    await this.send('debit', 'WINCRES TRANSACTION ALERT');
  }

  async sendDenyAccess() {
    await this.send('denyAccess', 'WINCRES SECURITY ALERT');
  }

  async sendResetToken() {
    await this.send('resetToken', 'WINCRES PASSWORD RESET');
  }
};
