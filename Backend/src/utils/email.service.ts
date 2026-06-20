import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
    },
});

const generatePDFInvoice = (bookingDetails: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const buffers: Buffer[] = [];

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Colors
            const primaryColor = "#4F46E5"; // Indigo 600
            const secondaryColor = "#1F2937"; // Gray 800
            const lightGray = "#F3F4F6"; // Gray 100
            const accentColor = "#10B981"; // Emerald 500

            // Header - Logo and Title
            doc.fillColor(primaryColor).fontSize(28).text("PARKIFY", 50, 50, { characterSpacing: 2 });
            doc.fillColor(secondaryColor).fontSize(10).text("SMART PARKING SOLUTIONS", 50, 80);
            
            doc.fillColor(secondaryColor).fontSize(20).text("INVOICE", 400, 50, { align: "right" });
            doc.fontSize(10).fillColor("#6B7280").text(`Invoice No: INV-${Date.now().toString().slice(-6)}`, 400, 75, { align: "right" });
            doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 400, 90, { align: "right" });

            doc.moveDown(3);
            doc.strokeColor(lightGray).lineWidth(1).moveTo(50, 110).lineTo(550, 110).stroke();

            // Billing Details Section
            let yPos = 140;
            doc.fillColor(primaryColor).fontSize(12).text("BILL TO:", 50, yPos);
            doc.fillColor(secondaryColor).fontSize(10).text("Valued Customer", 50, yPos + 20);
            doc.fillColor("#6B7280").text(`Vehicle: ${bookingDetails.vehicleNumber}`, 50, yPos + 35);

            doc.fillColor(primaryColor).fontSize(12).text("PARKING LOCATION:", 300, yPos);
            doc.fillColor(secondaryColor).fontSize(10).text(bookingDetails.lotName, 300, yPos + 20);
            doc.fillColor("#6B7280").text(`Slot: ${bookingDetails.slotNumber}`, 300, yPos + 35);

            doc.moveDown(4);
            yPos = doc.y + 20;

            // Table Header
            doc.rect(50, yPos, 500, 25).fill(lightGray);
            doc.fillColor(secondaryColor).fontSize(10);
            doc.text("DESCRIPTION", 60, yPos + 8);
            doc.text("TIME / DURATION", 250, yPos + 8);
            doc.text("AMOUNT", 450, yPos + 8, { align: "right", width: 90 });

            // Table Body
            yPos += 35;
            doc.fillColor(secondaryColor);
            doc.text(`Parking Space Reservation`, 60, yPos);
            doc.fontSize(9).fillColor("#6B7280");
            doc.text(`From: ${new Date(bookingDetails.startTime).toLocaleString('en-IN')}`, 250, yPos);
            doc.text(`To: ${new Date(bookingDetails.endTime).toLocaleString('en-IN')}`, 250, yPos + 15);
            
            doc.fontSize(10).fillColor(secondaryColor);
            doc.text(`Rs. ${bookingDetails.amount.toFixed(2)}`, 450, yPos, { align: "right", width: 90 });

            doc.strokeColor(lightGray).lineWidth(0.5).moveTo(50, yPos + 40).lineTo(550, yPos + 40).stroke();

            // Total Amount
            yPos += 60;
            doc.rect(300, yPos, 250, 40).fill(primaryColor);
            doc.fillColor("#FFFFFF").fontSize(14).text("TOTAL PAID", 320, yPos + 13);
            doc.fontSize(18).text(`Rs. ${bookingDetails.amount.toFixed(2)}`, 400, yPos + 11, { align: "right", width: 140 });

            // Footer
            doc.fillColor("#9CA3AF").fontSize(9).text("Terms & Conditions: This is a computer generated invoice and does not require a physical signature. Thank you for your business!", 50, 750, { align: "center", width: 500 });
            doc.fillColor(primaryColor).fontSize(10).text("www.parkify.com", 50, 770, { align: "center", width: 500 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

export const sendInvoiceEmail = async (email: string, bookingDetails: any) => {
    const { vehicleNumber, slotNumber, lotName, startTime, endTime, amount } = bookingDetails;
    
    try {
        const pdfBuffer = await generatePDFInvoice(bookingDetails);

        const mailOptions = {
            from: '"Parkify Support" <support@parkify.com>',
            to: email,
            subject: `Payment Receipt: Your Parking at ${lotName}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
                        .header { background-color: #4f46e5; color: white; padding: 40px 20px; text-align: center; }
                        .content { padding: 30px; line-height: 1.6; color: #374151; }
                        .details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f3f4f6; }
                        .footer { padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; background-color: #f9fafb; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
                        .highlight { color: #4f46e5; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin: 0; font-size: 24px;">Booking Confirmed!</h1>
                            <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for choosing Parkify</p>
                        </div>
                        <div class="content">
                            <p>Hello,</p>
                            <p>Great news! Your payment for the parking reservation at <span class="highlight">${lotName}</span> has been successfully processed.</p>
                            
                            <div class="details">
                                <h3 style="margin-top: 0; color: #111827;">Reservation Summary</h3>
                                <p style="margin: 5px 0;"><strong>Vehicle:</strong> ${vehicleNumber}</p>
                                <p style="margin: 5px 0;"><strong>Slot:</strong> ${slotNumber}</p>
                                <p style="margin: 5px 0;"><strong>Amount Paid:</strong> Rs. ${amount.toFixed(2)}</p>
                            </div>
                            
                            <p>We've attached your official PDF invoice to this email for your records. Please keep it handy for your reference.</p>
                            
                            <p>If you have any questions or need assistance, feel free to reply to this email or visit our support center.</p>
                            
                            <a href="#" class="button">Manage Your Booking</a>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 Parkify Smart Parking Management System</p>
                            <p>123 Parking Way, Tech City, India</p>
                        </div>
                    </div>
                </body>
                </html>     
            `,
            attachments: [
                {
                    filename: `Parkify_Invoice_${vehicleNumber}_${Date.now().toString().slice(-4)}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log("Invoice email with premium PDF attachment sent to:", email);
    } catch (error) {
        console.error("Error sending premium invoice email:", error);
    }
};
