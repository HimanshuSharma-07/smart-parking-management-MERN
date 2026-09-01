import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

// ============================================================
// SMTP TRANSPORTER
// ============================================================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
    },
});

// ============================================================
// GENERATE PDF INVOICE
// ============================================================

const generatePDFInvoice = (
    bookingDetails: any
): Promise<Buffer> => {

    return new Promise((resolve, reject) => {

        try {

            // ====================================================
            // PDF SETUP
            // ====================================================

            const doc = new PDFDocument({
                size: "A4",
                margin: 0,
            });

            const buffers: Buffer[] = [];

            doc.on("data", (chunk) => {
                buffers.push(chunk);
            });

            doc.on("end", () => {
                resolve(Buffer.concat(buffers));
            });

            doc.on("error", reject);

            // ====================================================
            // COLORS
            // ====================================================

            const colors = {
                navy: "#0F172A",
                darkNavy: "#111827",
                indigo: "#312E81",

                green: "#059669",
                darkGreen: "#047857",

                lightGreen: "#ECFDF5",
                greenBorder: "#A7F3D0",

                white: "#FFFFFF",

                lightGray: "#F8FAFC",
                grayBorder: "#E2E8F0",

                gray: "#64748B",
                darkGray: "#334155",

                black: "#111827",
            };

            // ====================================================
            // PAGE DIMENSIONS
            // ====================================================

            const pageWidth = 595.28;
            const pageHeight = 841.89;

            // ====================================================
            // BOOKING DATA
            // ====================================================

            const {
                vehicleNumber,
                slotNumber,
                lotName,
                startTime,
                endTime,
                amount,
            } = bookingDetails;

            const start = new Date(startTime);
            const end = new Date(endTime);

            // ====================================================
            // DATE FORMATTERS
            // ====================================================

            const formatDate = (date: Date): string => {

                return date.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                });

            };

            const formatTime = (date: Date): string => {

                return date.toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                });

            };

            const formatDateTime = (date: Date): string => {

                return `${formatDate(date)}, ${formatTime(date)}`;

            };

            // ====================================================
            // DURATION
            // ====================================================

            const durationMs =
                end.getTime() - start.getTime();

            const durationHours =
                Math.round(
                    durationMs / (1000 * 60 * 60)
                );

            // ====================================================
            // INVOICE NUMBER
            // ====================================================

            const invoiceNumber =
                `INV-${Date.now()
                    .toString()
                    .slice(-6)}`;

            // ====================================================
            // AMOUNT
            // ====================================================

            const totalAmount =
                Number(amount || 0);

            /*
             * PDFKit default Helvetica does not reliably support
             * the ₹ Unicode character.
             *
             * "Rs." is used here so the PDF works reliably
             * without requiring an external font.
             */

            const formattedAmount =
                `Rs. ${totalAmount.toFixed(2)}`;

            // ====================================================
            // BACKGROUND
            // ====================================================

            doc.rect(
                0,
                0,
                pageWidth,
                pageHeight
            )
                .fill(colors.white);

            // ====================================================
            // HEADER
            // ====================================================

            // Main header
            doc.rect(
                0,
                0,
                pageWidth,
                115
            )
                .fill(colors.darkNavy);

            // Right side indigo section
            doc.rect(
                300,
                0,
                pageWidth - 300,
                115
            )
                .fill(colors.indigo);

            // Green line
            doc.rect(
                0,
                113,
                pageWidth,
                3
            )
                .fill(colors.green);

            // ====================================================
            // PARKIFY LOGO
            // ====================================================

            doc.fillColor(colors.white)
                .font("Helvetica-Bold")
                .fontSize(32)
                .text(
                    "PARK",
                    42,
                    31
                );

            doc.fillColor("#10B981")
                .font("Helvetica-Bold")
                .fontSize(32)
                .text(
                    "IFY",
                    130,
                    31
                );

            // ====================================================
            // LOGO SUBTITLE
            // ====================================================

            doc.fillColor("#CBD5E1")
                .font("Helvetica")
                .fontSize(9.5)
                .text(
                    "SMART PARKING SOLUTIONS",
                    43,
                    73
                );

            // ====================================================
            // INVOICE TITLE
            // ====================================================

            doc.fillColor(colors.white)
                .font("Helvetica-Bold")
                .fontSize(25)
                .text(
                    "INVOICE",
                    365,
                    27,
                    {
                        width: 190,
                        align: "right",
                    }
                );

            // Invoice number
            doc.fillColor("#CBD5E1")
                .font("Helvetica")
                .fontSize(9)
                .text(
                    `Invoice No: ${invoiceNumber}`,
                    350,
                    62,
                    {
                        width: 205,
                        align: "right",
                    }
                );

            // Date
            doc.text(
                `Date: ${formatDate(new Date())}`,
                350,
                77,
                {
                    width: 205,
                    align: "right",
                }
            );

            // Time
            doc.text(
                `Time: ${formatTime(new Date())}`,
                350,
                92,
                {
                    width: 205,
                    align: "right",
                }
            );

            // ====================================================
            // CARD HELPER
            // ====================================================

            const drawCard = (
                x: number,
                y: number,
                width: number,
                height: number
            ) => {

                doc.roundedRect(
                    x,
                    y,
                    width,
                    height,
                    10
                )
                    .lineWidth(1)
                    .fillAndStroke(
                        colors.lightGray,
                        colors.grayBorder
                    );

            };

            // ====================================================
            // ICON BOX HELPER
            // ====================================================

            const drawIconBox = (
                x: number,
                y: number,
                size = 42
            ) => {

                doc.roundedRect(
                    x,
                    y,
                    size,
                    size,
                    9
                )
                    .fillAndStroke(
                        colors.lightGreen,
                        "#D1FAE5"
                    );

            };

            // ====================================================
            // LOCATION + VEHICLE CARD
            // ====================================================

            drawCard(
                35,
                135,
                525,
                105
            );

            // Divider
            doc.moveTo(297, 153)
                .lineTo(297, 222)
                .lineWidth(1)
                .strokeColor(colors.grayBorder)
                .stroke();

            // ====================================================
            // LOCATION
            // ====================================================

            drawIconBox(52, 157, 48);

            // Location icon - pin
            doc.circle(76, 178, 10)
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            doc.circle(76, 178, 3)
                .fill(colors.green);

            doc.moveTo(68, 184)
                .lineTo(76, 194)
                .lineTo(84, 184)
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "PARKING LOCATION",
                    115,
                    158
                );

            // Location
            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(15)
                .text(
                    lotName || "Parking Location",
                    115,
                    178,
                    {
                        width: 160,
                    }
                );

            // Location subtitle
            doc.fillColor(colors.gray)
                .font("Helvetica")
                .fontSize(10)
                .text(
                    "Elante Mall",
                    115,
                    199
                );

            // ====================================================
            // VEHICLE
            // ====================================================

            drawIconBox(315, 157, 48);

            // Car body
            doc.roundedRect(
                325,
                174,
                28,
                13,
                3
            )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Car roof
            doc.moveTo(330, 174)
                .lineTo(334, 167)
                .lineTo(345, 167)
                .lineTo(349, 174)
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Wheels
            doc.circle(332, 189, 3)
                .fill(colors.green);

            doc.circle(347, 189, 3)
                .fill(colors.green);

            // Label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "VEHICLE",
                    378,
                    158
                );

            // Vehicle number
            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(15)
                .text(
                    vehicleNumber || "N/A",
                    378,
                    178
                );

            // Subtitle
            doc.fillColor(colors.gray)
                .font("Helvetica")
                .fontSize(10)
                .text(
                    "Vehicle Number",
                    378,
                    199
                );

            // ====================================================
            // SMALL CARDS
            // ====================================================

            const cardY1 = 258;
            const cardY2 = 340;

            // ====================================================
            // SPOT & FLOOR
            // ====================================================

            drawCard(
                35,
                cardY1,
                252,
                65
            );

            drawIconBox(
                50,
                cardY1 + 12,
                40
            );

            // Parking icon
            doc.rect(
                60,
                cardY1 + 22,
                20,
                20
            )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(13)
                .text(
                    "P",
                    65,
                    cardY1 + 24
                );

            // Label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "SPOT & FLOOR",
                    105,
                    cardY1 + 16
                );

            // Value
            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(13)
                .text(
                    slotNumber || "N/A",
                    105,
                    cardY1 + 37,
                    {
                        width: 160,
                    }
                );

            // ====================================================
            // START TIME
            // ====================================================

            drawCard(
                308,
                cardY1,
                252,
                65
            );

            drawIconBox(
                323,
                cardY1 + 12,
                40
            );

            // Calendar
            doc.rect(
                332,
                cardY1 + 22,
                22,
                18
            )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Calendar top
            doc.moveTo(
                332,
                cardY1 + 28
            )
                .lineTo(
                    354,
                    cardY1 + 28
                )
                .strokeColor(colors.green)
                .stroke();

            // Calendar rings
            doc.moveTo(
                337,
                cardY1 + 19
            )
                .lineTo(
                    337,
                    cardY1 + 25
                )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            doc.moveTo(
                349,
                cardY1 + 19
            )
                .lineTo(
                    349,
                cardY1 + 25
                )
                .strokeColor(colors.green)
                .stroke();

            // Label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "START TIME",
                    378,
                    cardY1 + 16
                );

            // Value
            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(10)
                .text(
                    formatDateTime(start),
                    378,
                    cardY1 + 37,
                    {
                        width: 165,
                    }
                );

            // ====================================================
            // DURATION
            // ====================================================

            drawCard(
                35,
                cardY2,
                252,
                65
            );

            drawIconBox(
                50,
                cardY2 + 12,
                40
            );

            // Clock
            doc.circle(
                70,
                cardY2 + 32,
                11
            )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Clock hands
            doc.moveTo(
                70,
                cardY2 + 32
            )
                .lineTo(
                    70,
                    cardY2 + 25
                )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            doc.moveTo(
                70,
                cardY2 + 32
            )
                .lineTo(
                    77,
                    cardY2 + 36
                )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "DURATION",
                    105,
                    cardY2 + 16
                );

            // Value
            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(14)
                .text(
                    `${durationHours} hrs`,
                    105,
                    cardY2 + 37
                );

            // ====================================================
            // PARKING TYPE
            // ====================================================

            drawCard(
                308,
                cardY2,
                252,
                65
            );

            drawIconBox(
                323,
                cardY2 + 12,
                40
            );

            // Car
            doc.roundedRect(
                331,
                cardY2 + 29,
                24,
                11,
                3
            )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            doc.moveTo(
                335,
                cardY2 + 29
            )
                .lineTo(
                    338,
                    cardY2 + 23
                )
                .lineTo(
                    348,
                    cardY2 + 23
                )
                .lineTo(
                    351,
                    cardY2 + 29
                )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            doc.circle(
                337,
                cardY2 + 42,
                2.5
            )
                .fill(colors.green);

            doc.circle(
                350,
                cardY2 + 42,
                2.5
            )
                .fill(colors.green);

            // Label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(9)
                .text(
                    "PARKING TYPE",
                    378,
                    cardY2 + 16
                );

            // Value
            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(13)
                .text(
                    "Regular Parking",
                    378,
                    cardY2 + 37
                );

            // ====================================================
            // DESCRIPTION CARD
            // ====================================================

            const tableX = 35;
            const tableY = 425;
            const tableWidth = 525;
            const tableHeight = 180;

            drawCard(
                tableX,
                tableY,
                tableWidth,
                tableHeight
            );

            // ====================================================
            // TABLE HEADER
            // ====================================================

            doc.rect(
                tableX,
                tableY,
                tableWidth,
                43
            )
                .fill("#F0FDF4");

            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(10)
                .text(
                    "DESCRIPTION",
                    53,
                    tableY + 16
                );

            doc.text(
                "AMOUNT",
                450,
                tableY + 16,
                {
                    width: 85,
                    align: "right",
                }
            );

            // ====================================================
            // DESCRIPTION
            // ====================================================

            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(11)
                .text(
                    "Parking Space Reservation",
                    53,
                    tableY + 62
                );

            // From
            doc.fillColor(colors.gray)
                .font("Helvetica")
                .fontSize(9)
                .text(
                    `From: ${formatDateTime(start)}`,
                    53,
                    tableY + 86
                );

            // To
            doc.text(
                `To: ${formatDateTime(end)}`,
                53,
                tableY + 105
            );

            // ====================================================
            // AMOUNT
            // ====================================================

            doc.fillColor(colors.navy)
                .font("Helvetica-Bold")
                .fontSize(12)
                .text(
                    formattedAmount,
                    430,
                    tableY + 64,
                    {
                        width: 105,
                        align: "right",
                    }
                );

            // ====================================================
            // DASHED DIVIDER
            // ====================================================

            doc.moveTo(
                53,
                tableY + 130
            )
                .lineTo(
                    542,
                    tableY + 130
                )
                .dash(3, {
                    space: 3,
                })
                .lineWidth(0.7)
                .strokeColor("#CBD5E1")
                .stroke();

            // Reset dash
            doc.undash();

            // ====================================================
            // TOTAL SECTION
            // ====================================================

            const totalY = tableY + 130;

            doc.roundedRect(
                35,
                totalY,
                525,
                75,
                10
            )
                .fillAndStroke(
                    colors.lightGreen,
                    colors.greenBorder
                );

            // Total label
            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(13)
                .text(
                    "TOTAL AMOUNT",
                    53,
                    totalY + 20
                );

            // Tax text
            doc.fillColor(colors.darkGreen)
                .font("Helvetica")
                .fontSize(9)
                .text(
                    "Includes all taxes",
                    53,
                    totalY + 43
                );

            // Total value
            doc.fillColor(colors.darkGreen)
                .font("Helvetica-Bold")
                .fontSize(22)
                .text(
                    formattedAmount,
                    380,
                    totalY + 21,
                    {
                        width: 145,
                        align: "right",
                    }
                );

            // ====================================================
            // THANK YOU CARD
            // ====================================================

            const thankY = 635;

            drawCard(
                35,
                thankY,
                525,
                88
            );

            // ====================================================
            // CHECK ICON
            // ====================================================

            doc.roundedRect(
                50,
                thankY + 20,
                42,
                42,
                10
            )
                .fillAndStroke(
                    colors.lightGreen,
                    "#D1FAE5"
                );

            doc.circle(
                71,
                thankY + 41,
                11
            )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // Check mark
            doc.moveTo(
                65,
                thankY + 41
            )
                .lineTo(
                    69,
                    thankY + 45
                )
                .lineTo(
                    78,
                    thankY + 35
                )
                .lineWidth(2)
                .strokeColor(colors.green)
                .stroke();

            // ====================================================
            // THANK YOU TEXT
            // ====================================================

            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(12)
                .text(
                    "Thank you for choosing Parkify!",
                    110,
                    thankY + 21
                );

            doc.fillColor(colors.darkGray)
                .font("Helvetica")
                .fontSize(9.5)
                .text(
                    "Your parking has been successfully booked.",
                    110,
                    thankY + 44
                );

            doc.text(
                "We hope you have a smooth and convenient experience.",
                110,
                thankY + 60
            );

            // ====================================================
            // CONTACT CARD
            // ====================================================

            const contactY = 744;

            doc.roundedRect(
                35,
                contactY,
                525,
                48,
                9
            )
                .fillAndStroke(
                    colors.lightGray,
                    colors.grayBorder
                );

            // Website
            doc.fillColor(colors.darkGray)
                .font("Helvetica")
                .fontSize(8.5)
                .text(
                    "www.parkify.com",
                    55,
                    contactY + 18
                );

            // Divider
            doc.moveTo(
                190,
                contactY + 9
            )
                .lineTo(
                    190,
                    contactY + 39
                )
                .strokeColor(colors.grayBorder)
                .stroke();

            // Phone
            doc.text(
                "+91 98765 43210",
                220,
                contactY + 18
            );

            // Divider
            doc.moveTo(
                390,
                contactY + 9
            )
                .lineTo(
                    390,
                    contactY + 39
                )
                .strokeColor(colors.grayBorder)
                .stroke();

            // Email
            doc.text(
                "support@parkify.com",
                415,
                contactY + 18
            );

            // ====================================================
            // FOOTER
            // ====================================================

            doc.fillColor(colors.gray)
                .font("Helvetica")
                .fontSize(8)
                .text(
                    "This is a system generated invoice.",
                    35,
                    808,
                    {
                        width: 525,
                        align: "center",
                    }
                );

            doc.fillColor(colors.green)
                .font("Helvetica-Bold")
                .fontSize(8)
                .text(
                    "No signature required.",
                    35,
                    821,
                    {
                        width: 525,
                        align: "center",
                    }
                );

            // ====================================================
            // FINISH PDF
            // ====================================================

            doc.end();

        } catch (error) {

            reject(error);

        }

    });

};

// ============================================================
// SEND INVOICE EMAIL
// ============================================================

export const sendInvoiceEmail = async (
    email: string,
    bookingDetails: any
) => {

    const {
        vehicleNumber,
        slotNumber,
        lotName,
        startTime,
        endTime,
        amount,
    } = bookingDetails;

    try {

        // ========================================================
        // GENERATE PDF
        // ========================================================

        const pdfBuffer =
            await generatePDFInvoice(
                bookingDetails
            );

        // ========================================================
        // EMAIL OPTIONS
        // ========================================================

        const mailOptions = {

            from:
                '"Parkify Support" <support@parkify.com>',

            to: email,

            subject:
                `Payment Receipt: Your Parking at ${lotName}`,

            // ====================================================
            // EMAIL HTML
            // ====================================================

            html: `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<style>

body {
    margin: 0;
    padding: 0;
    background-color: #f8fafc;
    font-family:
        Arial,
        Helvetica,
        sans-serif;
}

.container {
    max-width: 600px;
    margin: 30px auto;
    background: #ffffff;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
}

.header {
    background: linear-gradient(
        135deg,
        #0f172a,
        #312e81
    );

    color: white;

    padding: 35px 25px;

    text-align: center;
}

.logo {
    font-size: 28px;
    font-weight: bold;
    letter-spacing: 2px;
}

.logo span {
    color: #10b981;
}

.header h1 {
    margin: 20px 0 5px;
    font-size: 24px;
}

.header p {
    margin: 0;
    color: #cbd5e1;
}

.content {
    padding: 30px;
    color: #334155;
    line-height: 1.6;
}

.highlight {
    color: #059669;
    font-weight: bold;
}

.details {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 20px;
    margin: 25px 0;
}

.details h3 {
    margin-top: 0;
    color: #0f172a;
}

.details p {
    margin: 7px 0;
}

.amount {
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 10px;
    padding: 18px;
    margin: 20px 0;
}

.amount-label {
    color: #047857;
    font-weight: bold;
}

.amount-value {
    color: #047857;
    font-size: 25px;
    font-weight: bold;
    margin-top: 5px;
}

.footer {
    background: #f8fafc;
    padding: 22px;
    text-align: center;
    color: #94a3b8;
    font-size: 12px;
}

</style>

</head>

<body>

<div class="container">

    <div class="header">

        <div class="logo">
            PARK<span>IFY</span>
        </div>

        <h1>
            Booking Confirmed!
        </h1>

        <p>
            Thank you for choosing Parkify
        </p>

    </div>


    <div class="content">

        <p>
            Hello,
        </p>

        <p>
            Great news! Your payment for the
            parking reservation at
            <span class="highlight">
                ${lotName}
            </span>
            has been successfully processed.
        </p>


        <div class="details">

            <h3>
                Reservation Summary
            </h3>

            <p>
                <strong>
                    Vehicle:
                </strong>
                ${vehicleNumber}
            </p>

            <p>
                <strong>
                    Parking Slot:
                </strong>
                ${slotNumber}
            </p>

            <p>
                <strong>
                    Start:
                </strong>
                ${new Date(startTime).toLocaleString("en-IN")}
            </p>

            <p>
                <strong>
                    End:
                </strong>
                ${new Date(endTime).toLocaleString("en-IN")}
            </p>

        </div>


        <div class="amount">

            <div class="amount-label">
                TOTAL AMOUNT
            </div>

            <div class="amount-value">
                Rs. ${Number(amount).toFixed(2)}
            </div>

        </div>


        <p>
            We've attached your official PDF invoice
            to this email for your records.
        </p>

        <p>
            Please keep the invoice handy for
            your future reference.
        </p>

        <p>
            If you have any questions or need
            assistance, feel free to contact
            Parkify Support.
        </p>

    </div>


    <div class="footer">

        <p>
            © 2026 Parkify Smart Parking
            Management System
        </p>

        <p>
            support@parkify.com
        </p>

        <p>
            This is an automated email.
            Please do not reply directly.
        </p>

    </div>

</div>

</body>

</html>

            `,

            // ====================================================
            // PDF ATTACHMENT
            // ====================================================

            attachments: [

                {
                    filename:
                        `Parkify_Invoice_${vehicleNumber}_${Date.now()
                            .toString()
                            .slice(-4)}.pdf`,

                    content: pdfBuffer,

                    contentType:
                        "application/pdf",
                },

            ],

        };

        // ========================================================
        // SEND EMAIL
        // ========================================================

        await transporter.sendMail(
            mailOptions
        );

        console.log(
            "Invoice email sent successfully to:",
            email
        );

    } catch (error) {

        console.error(
            "Error sending invoice email:",
            error
        );

        throw error;
    }

};