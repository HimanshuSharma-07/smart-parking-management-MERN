import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
    },
});

const generatePDFInvoice = (bookingDetails: any): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Title
            doc.fillColor("#111827").fontSize(24).text("PARKIFY", { align: "left" });
            doc.fillColor("#9ca3af").fontSize(10).text("Smart Parking Management", { align: "left" });
            
            doc.moveDown();
            
            doc.fillColor("#111827").fontSize(20).text("INVOICE / RECEIPT");
            doc.fillColor("#6b7280").fontSize(10).text(`Date: ${new Date().toLocaleDateString()}`);
            
            doc.moveDown(2);

            // Table Structure
            const startY = doc.y;
            doc.rect(50, startY, 500, 20).fill("#f9fafb").stroke();
            doc.fillColor("#111827").fontSize(12).text("Booking Details", 60, startY + 5);

            let currentY = startY + 30;

            const drawRow = (label: string, value: string) => {
                doc.fillColor("#6b7280").fontSize(10).text(label, 60, currentY);
                doc.fillColor("#111827").text(value, 200, currentY);
                currentY += 20;
            };

            drawRow("Parking Lot", bookingDetails.lotName);
            drawRow("Slot Number", bookingDetails.slotNumber);
            drawRow("Vehicle Number", bookingDetails.vehicleNumber);
            drawRow("Start Time", new Date(bookingDetails.startTime).toLocaleString());
            drawRow("End Time", new Date(bookingDetails.endTime).toLocaleString());

            doc.moveDown(2);
            currentY += 20;

            // Total Amount
            doc.rect(50, currentY, 500, 40).fill("#f0fdf4").stroke("#bbf7d0");
            doc.fillColor("#374151").fontSize(14).text("Total Paid", 60, currentY + 13);
            doc.fillColor("#15803d").fontSize(18).text(`Rs. ${bookingDetails.amount}`, 400, currentY + 11, { align: "right", width: 130 });

            doc.moveDown(3);
            doc.fillColor("#9ca3af").fontSize(10).text("Thank you for choosing Parkify. Have a safe drive!", { align: "center" });

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
            from: '"Parkify" <noreply@parkify.com>',
            to: email,
            subject: `Booking Confirmation & Invoice - ${lotName}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #111827; text-align: center;">Booking Confirmed!</h2>
                    <p>Hello,</p>
                    <p>Your parking booking at <strong>${lotName}</strong> has been successfully confirmed.</p>
                    <p>We have attached your official PDF invoice to this email for your records.</p>
                    <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px;">
                        Thank you for choosing Parkify. Have a safe drive!
                    </p>
                </div>
            `,
            attachments: [
                {
                    filename: `Parkify_Invoice_${vehicleNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        console.log("Invoice email with PDF attachment sent to:", email);
    } catch (error) {
        console.error("Error sending invoice email:", error);
    }
};
