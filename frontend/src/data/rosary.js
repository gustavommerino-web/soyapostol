/**
 * Rosary content (Spanish + English).
 * Includes the four sets of mysteries (Joyful, Sorrowful, Glorious,
 * Luminous), the common prayers, and the day-of-week to mystery mapping
 * established by Pope John Paul II in Rosarium Virginis Mariae (2002).
 *
 *   Sun -> Glorious      Mon -> Joyful       Tue -> Sorrowful
 *   Wed -> Glorious      Thu -> Luminous     Fri -> Sorrowful
 *   Sat -> Joyful
 */

export const COMMON = {
    es: {
        signCross: {
            title: "Señal de la Cruz",
            text: "Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.",
        },
        offering: {
            title: "Ofrecimiento",
            text: "Señor mío Jesucristo, te ofrezco este Santo Rosario en honor de tu Madre Santísima, la Virgen María, por mis intenciones y por las necesidades de la Iglesia y del mundo.",
        },
        creed: {
            title: "Credo de los Apóstoles",
            text: "Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra. Creo en Jesucristo, su único Hijo, Nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos. Creo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna. Amén.",
        },
        ourFather: {
            title: "Padre Nuestro",
            text: "Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad, en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.",
        },
        hailMary: {
            title: "Ave María",
            text: "Dios te salve, María, llena eres de gracia, el Señor es contigo. Bendita tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. Santa María, Madre de Dios, ruega por nosotros pecadores, ahora y en la hora de nuestra muerte. Amén.",
        },
        gloryBe: {
            title: "Gloria",
            text: "Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.",
        },
        fatima: {
            title: "Oración de Fátima",
            text: "Oh Jesús mío, perdona nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia.",
        },
        hailHolyQueen: {
            title: "Salve",
            text: "Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A ti llamamos los desterrados hijos de Eva; a ti suspiramos, gimiendo y llorando, en este valle de lágrimas. Ea, pues, Señora, abogada nuestra, vuelve a nosotros esos tus ojos misericordiosos; y después de este destierro muéstranos a Jesús, fruto bendito de tu vientre. ¡Oh clementísima, oh piadosa, oh dulce siempre Virgen María! Ruega por nosotros, Santa Madre de Dios, para que seamos dignos de alcanzar las promesas de Nuestro Señor Jesucristo. Amén.",
        },
        closing: {
            title: "Oración final",
            text: "Te pedimos, Señor, que nosotros, tus siervos, gocemos siempre de salud de alma y cuerpo; y por la gloriosa intercesión de la bienaventurada siempre Virgen María, líbranos de las tristezas presentes y concédenos la alegría eterna. Por Cristo nuestro Señor. Amén.",
        },
        introHailMaryHints: ["Por la fe", "Por la esperanza", "Por la caridad"],
    },
    en: {
        signCross: {
            title: "Sign of the Cross",
            text: "By the sign of the Holy Cross, deliver us from our enemies, O Lord our God. In the name of the Father, and of the Son, and of the Holy Spirit. Amen.",
        },
        offering: {
            title: "Offering",
            text: "Lord Jesus Christ, I offer you this Holy Rosary in honor of your most holy Mother, the Virgin Mary, for my intentions and for the needs of the Church and the world.",
        },
        creed: {
            title: "Apostles' Creed",
            text: "I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried; he descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.",
        },
        ourFather: {
            title: "Our Father",
            text: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come, thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
        },
        hailMary: {
            title: "Hail Mary",
            text: "Hail Mary, full of grace, the Lord is with thee; blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
        },
        gloryBe: {
            title: "Glory Be",
            text: "Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.",
        },
        fatima: {
            title: "Fatima Prayer",
            text: "O my Jesus, forgive us our sins, save us from the fires of hell. Lead all souls to heaven, especially those most in need of thy mercy.",
        },
        hailHolyQueen: {
            title: "Hail Holy Queen",
            text: "Hail, Holy Queen, Mother of mercy, our life, our sweetness, and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Pray for us, O holy Mother of God, that we may be made worthy of the promises of Christ. Amen.",
        },
        closing: {
            title: "Closing Prayer",
            text: "We beseech thee, O Lord, that we thy servants may rejoice in continual health of mind and body; and through the glorious intercession of the Blessed Mary ever Virgin, may be delivered from present sorrow and enjoy eternal gladness. Through Christ our Lord. Amen.",
        },
        introHailMaryHints: ["For faith", "For hope", "For charity"],
    },
};

export const MYSTERY_SETS = {
    joyful: {
        es: {
            label: "Misterios Gozosos",
            mysteries: [
                { title: "La Anunciación", scripture: "Lc 1, 26-38", meditation: "El ángel Gabriel anuncia a María que será Madre del Hijo de Dios. Pidamos la gracia de la humildad para decir, como ella, «hágase en mí según tu palabra»." },
                { title: "La Visitación", scripture: "Lc 1, 39-56", meditation: "María visita a su prima Isabel y proclama el Magníficat. Pidamos la gracia de la caridad fraterna y de un corazón que alabe a Dios en todo." },
                { title: "El Nacimiento de Jesús", scripture: "Lc 2, 1-21", meditation: "Jesús nace en Belén y es acostado en un pesebre. Pidamos la gracia del desprendimiento y del amor a la pobreza evangélica." },
                { title: "La Presentación en el Templo", scripture: "Lc 2, 22-40", meditation: "María y José presentan al Niño en el Templo. Pidamos la gracia de la obediencia a Dios y la pureza de corazón." },
                { title: "El Niño Jesús perdido y hallado", scripture: "Lc 2, 41-52", meditation: "María y José encuentran a Jesús enseñando en el Templo. Pidamos la gracia de buscar a Cristo cuando lo perdemos por el pecado." },
            ],
        },
        en: {
            label: "Joyful Mysteries",
            mysteries: [
                { title: "The Annunciation", scripture: "Lk 1:26-38", meditation: "The angel Gabriel announces to Mary that she will be the Mother of the Son of God. Let us ask for the grace of humility to say, with her, \"let it be done unto me according to thy word.\"" },
                { title: "The Visitation", scripture: "Lk 1:39-56", meditation: "Mary visits her cousin Elizabeth and proclaims the Magnificat. Let us ask for the grace of fraternal charity and a heart that praises God in all things." },
                { title: "The Nativity", scripture: "Lk 2:1-21", meditation: "Jesus is born in Bethlehem and laid in a manger. Let us ask for the grace of detachment and love of evangelical poverty." },
                { title: "The Presentation in the Temple", scripture: "Lk 2:22-40", meditation: "Mary and Joseph present the Child in the Temple. Let us ask for the grace of obedience to God and purity of heart." },
                { title: "The Finding in the Temple", scripture: "Lk 2:41-52", meditation: "Mary and Joseph find Jesus teaching in the Temple. Let us ask for the grace to seek Christ when sin separates us from him." },
            ],
        },
    },
    sorrowful: {
        es: {
            label: "Misterios Dolorosos",
            mysteries: [
                { title: "La Oración en el Huerto", scripture: "Mt 26, 36-46", meditation: "Jesús sufre la agonía en Getsemaní. Pidamos la gracia de la contrición de los pecados y la fuerza para hacer la voluntad del Padre." },
                { title: "La Flagelación", scripture: "Jn 19, 1", meditation: "Jesús es azotado por nuestros pecados. Pidamos la gracia de la mortificación de los sentidos y la pureza." },
                { title: "La Coronación de Espinas", scripture: "Mt 27, 27-31", meditation: "Coronan a Jesús con espinas y se burlan de Él. Pidamos la gracia del desprendimiento del orgullo y el amor a la humillación." },
                { title: "Jesús con la Cruz a cuestas", scripture: "Lc 23, 26-32", meditation: "Jesús camina al Calvario cargando su cruz. Pidamos la gracia de la paciencia en las pruebas y el espíritu de sacrificio." },
                { title: "La Crucifixión y muerte de Jesús", scripture: "Lc 23, 33-46", meditation: "Jesús muere en la Cruz por nuestra salvación. Pidamos la gracia de la perseverancia final y el amor que llega hasta el extremo." },
            ],
        },
        en: {
            label: "Sorrowful Mysteries",
            mysteries: [
                { title: "The Agony in the Garden", scripture: "Mt 26:36-46", meditation: "Jesus suffers his agony in Gethsemane. Let us ask for the grace of contrition for our sins and strength to do the Father's will." },
                { title: "The Scourging at the Pillar", scripture: "Jn 19:1", meditation: "Jesus is scourged for our sins. Let us ask for the grace of mortification of the senses and for purity." },
                { title: "The Crowning with Thorns", scripture: "Mt 27:27-31", meditation: "Jesus is crowned with thorns and mocked. Let us ask for detachment from pride and love of humble service." },
                { title: "The Carrying of the Cross", scripture: "Lk 23:26-32", meditation: "Jesus carries his Cross to Calvary. Let us ask for the grace of patience in trials and a spirit of sacrifice." },
                { title: "The Crucifixion and Death of Jesus", scripture: "Lk 23:33-46", meditation: "Jesus dies on the Cross for our salvation. Let us ask for final perseverance and love to the very end." },
            ],
        },
    },
    glorious: {
        es: {
            label: "Misterios Gloriosos",
            mysteries: [
                { title: "La Resurrección de Jesús", scripture: "Mt 28, 1-10", meditation: "Jesús resucita de entre los muertos al tercer día. Pidamos la gracia de una fe viva y de la esperanza cristiana." },
                { title: "La Ascensión del Señor", scripture: "Lc 24, 50-53", meditation: "Jesús sube al cielo y se sienta a la derecha del Padre. Pidamos el deseo de las cosas del cielo." },
                { title: "La Venida del Espíritu Santo", scripture: "Hch 2, 1-13", meditation: "El Espíritu Santo desciende sobre los Apóstoles y María. Pidamos los dones del Espíritu y un corazón apostólico." },
                { title: "La Asunción de María al Cielo", scripture: "Ap 12, 1", meditation: "María es llevada al cielo en cuerpo y alma. Pidamos la gracia de una buena muerte y el amor filial a la Virgen." },
                { title: "La Coronación de la Virgen María", scripture: "Ap 12, 1", meditation: "María es coronada como Reina del cielo y de la tierra. Pidamos su intercesión maternal y la perseverancia en la gracia." },
            ],
        },
        en: {
            label: "Glorious Mysteries",
            mysteries: [
                { title: "The Resurrection", scripture: "Mt 28:1-10", meditation: "Jesus rises from the dead on the third day. Let us ask for a living faith and Christian hope." },
                { title: "The Ascension", scripture: "Lk 24:50-53", meditation: "Jesus ascends to heaven and is seated at the right hand of the Father. Let us ask for the desire of heavenly things." },
                { title: "The Descent of the Holy Spirit", scripture: "Acts 2:1-13", meditation: "The Holy Spirit descends upon the Apostles and Mary. Let us ask for his gifts and an apostolic heart." },
                { title: "The Assumption of Mary", scripture: "Rev 12:1", meditation: "Mary is taken up into heaven in body and soul. Let us ask for the grace of a holy death and filial love for the Virgin." },
                { title: "The Coronation of Mary", scripture: "Rev 12:1", meditation: "Mary is crowned Queen of heaven and earth. Let us ask for her motherly intercession and perseverance in grace." },
            ],
        },
    },
    luminous: {
        es: {
            label: "Misterios Luminosos",
            mysteries: [
                { title: "El Bautismo en el Jordán", scripture: "Mt 3, 13-17", meditation: "Jesús es bautizado por Juan en el Jordán. Pidamos la gracia de vivir nuestro bautismo como hijos amados del Padre." },
                { title: "Las Bodas de Caná", scripture: "Jn 2, 1-12", meditation: "Jesús realiza su primer milagro a petición de María. Pidamos confianza en la intercesión de la Virgen." },
                { title: "El Anuncio del Reino y la conversión", scripture: "Mc 1, 14-15", meditation: "Jesús predica el Reino de Dios y llama a la conversión. Pidamos la gracia de un corazón que se convierta cada día." },
                { title: "La Transfiguración", scripture: "Mt 17, 1-8", meditation: "Jesús se transfigura en el monte ante Pedro, Santiago y Juan. Pidamos la contemplación del rostro de Cristo." },
                { title: "La Institución de la Eucaristía", scripture: "Mt 26, 26-28", meditation: "Jesús nos deja su Cuerpo y Sangre como alimento. Pidamos un amor eucarístico vivo y agradecido." },
            ],
        },
        en: {
            label: "Luminous Mysteries",
            mysteries: [
                { title: "The Baptism in the Jordan", scripture: "Mt 3:13-17", meditation: "Jesus is baptized by John in the Jordan. Let us ask for the grace to live our baptism as beloved children of the Father." },
                { title: "The Wedding at Cana", scripture: "Jn 2:1-12", meditation: "Jesus performs his first miracle at Mary's request. Let us ask for confidence in the Virgin's intercession." },
                { title: "The Proclamation of the Kingdom", scripture: "Mk 1:14-15", meditation: "Jesus preaches the Kingdom of God and calls to conversion. Let us ask for a heart that converts each day." },
                { title: "The Transfiguration", scripture: "Mt 17:1-8", meditation: "Jesus is transfigured before Peter, James and John. Let us ask for the grace to contemplate the face of Christ." },
                { title: "The Institution of the Eucharist", scripture: "Mt 26:26-28", meditation: "Jesus gives us his Body and Blood as food. Let us ask for a living and grateful Eucharistic love." },
            ],
        },
    },
};

// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const DAY_TO_KEY = ["glorious", "joyful", "sorrowful", "glorious", "luminous", "sorrowful", "joyful"];

export function mysteryKeyForDate(date = new Date()) {
    return DAY_TO_KEY[date.getDay()];
}

/**
 * Build the linear list of slides for a given mystery key + language.
 * Slide kinds:
 *   - cover            (intro screen with mystery name + Begin button)
 *   - prayer           (single prayer slide; common.text + title)
 *   - hailMaryRepeat   (Hail Mary with bead counter; meta.count)
 *   - mystery          (announce slide: title, scripture, meditation, ordinal)
 *   - end              (final celebratory slide)
 */
export function buildSlides(mysteryKey, lang) {
    const c = COMMON[lang] || COMMON.es;
    const set = (MYSTERY_SETS[mysteryKey] && (MYSTERY_SETS[mysteryKey][lang] || MYSTERY_SETS[mysteryKey].es)) || MYSTERY_SETS.joyful.es;

    const slides = [];

    slides.push({ kind: "cover", mysteryKey, label: set.label });
    slides.push({ kind: "prayer", title: c.signCross.title, text: c.signCross.text });
    slides.push({ kind: "prayer", title: c.offering.title, text: c.offering.text });
    slides.push({ kind: "prayer", title: c.creed.title, text: c.creed.text });
    slides.push({ kind: "prayer", title: c.ourFather.title, text: c.ourFather.text });
    slides.push({
        kind: "hailMaryRepeat",
        title: c.hailMary.title,
        text: c.hailMary.text,
        count: 3,
        hints: c.introHailMaryHints,
    });
    slides.push({ kind: "prayer", title: c.gloryBe.title, text: c.gloryBe.text });

    set.mysteries.forEach((m, idx) => {
        slides.push({
            kind: "mystery",
            ordinal: idx + 1,
            title: m.title,
            scripture: m.scripture,
            meditation: m.meditation,
            label: set.label,
        });
        slides.push({ kind: "prayer", title: c.ourFather.title, text: c.ourFather.text });
        slides.push({
            kind: "hailMaryRepeat",
            title: c.hailMary.title,
            text: c.hailMary.text,
            count: 10,
            decade: idx + 1,
        });
        slides.push({
            kind: "prayer",
            title: `${c.gloryBe.title} · ${c.fatima.title}`,
            text: `${c.gloryBe.text}\n\n${c.fatima.text}`,
        });
    });

    slides.push({ kind: "prayer", title: c.hailHolyQueen.title, text: c.hailHolyQueen.text });
    slides.push({ kind: "prayer", title: c.closing.title, text: c.closing.text });
    slides.push({ kind: "prayer", title: c.signCross.title, text: c.signCross.text });
    slides.push({ kind: "end", label: set.label });

    return slides;
}
