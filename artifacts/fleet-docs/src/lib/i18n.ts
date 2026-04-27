import { usePreferences, type Language } from "@/lib/preferences";

const translations = {
  uz: {
    appName: "NAZORAT 24",
    appSubtitle: "Transport va hujjat boshqaruvi",

    dashboard: "Boshqaruv paneli",
    vehicles: "Transportlar",
    documents: "Hujjatlar",
    tirCarnets: "TIR Carnet",
dazvols: "Dazvollar",
    companies: "Kompaniyalar",
    support: "Support",
telegram: "Telegram",
    callBot: "Support markazi",
ads: "Reklama",



    adminConsole: "Admin panel",
    platformAdministrator: "Platforma administratori",
    vehicleDocumentManagement: "Transport vositalari va hujjatlarni boshqarish",

    notifications: "Bildirishnomalar",
    notificationsDescription: "Transport hujjatlari muddati bo‘yicha ogohlantirishlar",
    noNotifications: "Hozircha bildirishnoma mavjud emas",
    expired: "Muddati o‘tgan",
    expiring: "Muddati yaqinlashmoqda",

    profile: "Profil",
    language: "Til",
    theme: "Ko‘rinish rejimi",
    light: "Yorug‘ rejim",
    dark: "Tungi rejim",
    system: "Tizim sozlamasi",
    signOut: "Tizimdan chiqish",
    signedInAs: "Tizimga kirgan foydalanuvchi",

    profileSettings: "Profil sozlamalari",
    profileSettingsHint:
      "Profil ma’lumotlarini boshqarish orqali foydalanuvchi hisobini qulay va xavfsiz yuritish mumkin.",
    openCallBot: "Support markazini ochish",

    callBotTitle: "Mijozlarni qo‘llab-quvvatlash markazi",
    callBotDescription:
      "Platforma bo‘yicha savol, texnik muammo va takliflar uchun yagona murojaat markazi.",
    callBotIntro:
      "Murojaatlaringiz support tizimida qayd etiladi. Mas’ul mutaxassislar javoblari ushbu sahifada aks etadi.",
    quickHelp: "Tezkor yo‘riqnoma",

    helpDocuments: "Hujjat qo‘shish",
    helpDocumentsText:
      "Hujjatlar bo‘limida transport vositasiga tegishli hujjatni qo‘shing va amal qilish muddatini kiriting.",
    helpUpload: "Fayl biriktirish",
    helpUploadText:
      "PDF, JPG, PNG yoki WEBP formatidagi faylni hujjat formasiga biriktiring.",
    helpTelegram: "Telegram bildirishnomalari",
    helpTelegramText:
      "Dashboard orqali test xabar yuboring yoki muddati yaqinlashgan hujjatlar bo‘yicha ogohlantirishlarni jo‘nating.",
    helpReports: "Excel hisobotlar",
    helpReportsText:
      "Hujjatlar sahifasida muddati yaqinlashgan yoki muddati o‘tgan hujjatlar bo‘yicha Excel hisobot yuklab oling.",
  },

  ru: {
    appName: "NAZORAT 24",
    appSubtitle: "Управление транспортом и документами",

    dashboard: "Панель управления",
    vehicles: "Транспорт",
    documents: "Документы",
    tirCarnets: "TIR Carnet",
dazvols: "Дозволы",
    companies: "Компании",
    support: "Поддержка",
telegram: "Telegram",
    callBot: "Центр поддержки",
ads: "Реклама",



    adminConsole: "Админ-панель",
    platformAdministrator: "Администратор платформы",
    vehicleDocumentManagement: "Управление транспортом и документами",

    notifications: "Уведомления",
    notificationsDescription: "Оповещения о сроках действия транспортных документов",
    noNotifications: "Уведомлений пока нет",
    expired: "Срок истёк",
    expiring: "Срок скоро истекает",

    profile: "Профиль",
    language: "Язык",
    theme: "Режим отображения",
    light: "Светлая тема",
    dark: "Тёмная тема",
    system: "Системная тема",
    signOut: "Выйти из системы",
    signedInAs: "Вы вошли как",

    profileSettings: "Настройки профиля",
    profileSettingsHint:
      "Управление данными профиля помогает удобно и безопасно использовать учетную запись.",
    openCallBot: "Открыть центр поддержки",

    callBotTitle: "Центр поддержки клиентов",
    callBotDescription:
      "Единый центр обращений по вопросам, техническим проблемам и предложениям по работе платформы.",
    callBotIntro:
      "Ваши обращения фиксируются в системе поддержки. Ответы ответственных специалистов отображаются на этой странице.",
    quickHelp: "Краткое руководство",

    helpDocuments: "Добавление документа",
    helpDocumentsText:
      "В разделе документов добавьте документ, связанный с транспортом, и укажите срок его действия.",
    helpUpload: "Прикрепление файла",
    helpUploadText:
      "Прикрепите к форме документа файл в формате PDF, JPG, PNG или WEBP.",
    helpTelegram: "Telegram-уведомления",
    helpTelegramText:
      "На панели управления отправьте тестовое сообщение или уведомления по документам с истекающим сроком.",
    helpReports: "Excel-отчёты",
    helpReportsText:
      "На странице документов загрузите Excel-отчёт по документам с истекающим или истекшим сроком.",
  },

  en: {
    appName: "NAZORAT 24",
    appSubtitle: "Vehicle and document management",

    dashboard: "Dashboard",
    vehicles: "Vehicles",
    documents: "Documents",
    tirCarnets: "TIR Carnet",
dazvols: "Permits",
    companies: "Companies",
    support: "Support",
telegram: "Telegram",
    callBot: "Support Center",
ads: "Ads",



    adminConsole: "Admin Console",
    platformAdministrator: "Platform administrator",
    vehicleDocumentManagement: "Vehicle and document management",

    notifications: "Notifications",
    notificationsDescription: "Expiry alerts for vehicle documents",
    noNotifications: "No notifications yet",
    expired: "Expired",
    expiring: "Expiring soon",

    profile: "Profile",
    language: "Language",
    theme: "Appearance",
    light: "Light mode",
    dark: "Dark mode",
    system: "System setting",
    signOut: "Sign out",
    signedInAs: "Signed in as",

    profileSettings: "Profile settings",
    profileSettingsHint:
      "Profile management helps keep your account convenient and secure.",
    openCallBot: "Open Support Center",

    callBotTitle: "Customer Support Center",
    callBotDescription:
      "A single support center for platform questions, technical issues, and service requests.",
    callBotIntro:
      "Your requests are registered in the support system. Responses from the responsible specialists are displayed on this page.",
    quickHelp: "Quick guide",

    helpDocuments: "Add a document",
    helpDocumentsText:
      "In the Documents section, add a document related to a vehicle and enter its validity period.",
    helpUpload: "Attach a file",
    helpUploadText:
      "Attach a PDF, JPG, PNG, or WEBP file to the document form.",
    helpTelegram: "Telegram notifications",
    helpTelegramText:
      "Use the dashboard to send a test message or send alerts for documents nearing expiry.",
    helpReports: "Excel reports",
    helpReportsText:
      "On the Documents page, download Excel reports for expiring or expired documents.",
  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof typeof translations.uz;

export function translate(language: Language, key: TranslationKey) {
  return translations[language][key] ?? translations.en[key] ?? key;
}

export function useT() {
  const language = usePreferences((s) => s.language);

  return (key: TranslationKey) => translate(language, key);
}