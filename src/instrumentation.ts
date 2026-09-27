// Next.js llama a register() una vez al arrancar el servidor.
// El import va dentro del `if` (no con un return antes) para que Next lo descarte
// al compilar para edge, donde nodemailer y Prisma no funcionan.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNewsletterScheduler } = await import("./server/newsletter/scheduler");
    startNewsletterScheduler();
  }
}
