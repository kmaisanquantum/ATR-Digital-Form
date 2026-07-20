import nodemailer from 'nodemailer';

export const sendAtrEmail = async (req, res) => {
  try {
    const { refNumber, formData, unit, date } = req.body;

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // Check if required SMTP authentication parameters are absent or evaluated as empty strings
    if (!smtpUser || !smtpPass) {
      return res.status(503).json({ error: 'Email service not configured' });
    }

    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const isSecure = smtpPort === 465;

    const recipient = process.env.ATR_INBOX || 'airoperationscenteratr@gmail.com';

    // Create transport
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    // Format clean email digest body
    const emailBody = `
Air Task Request Submission Digest
----------------------------------
Reference Number: ${refNumber || 'N/A'}
Requesting Unit: ${unit || 'N/A'}
Date of Task: ${date || 'N/A'}
Submitted At: ${new Date().toLocaleString()}

Please find the complete form data attached as a JSON configuration file.
    `;

    // Setup mail options
    const mailOptions = {
      from: smtpUser,
      to: recipient,
      subject: `ATR Submission — ${unit || 'Unit'} — ${date || 'Date'} [Ref: ${refNumber || 'N/A'}]`,
      text: emailBody,
      attachments: [
        {
          filename: `${refNumber || 'ATR'}.json`,
          content: Buffer.from(JSON.stringify(formData || {}, null, 2), 'utf-8')
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal transport error' });
  }
};
