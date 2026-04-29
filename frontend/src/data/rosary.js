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
            intro: "Señor mío Jesucristo, te ofrezco este Santo Rosario por las siguientes intenciones:",
            intentions: [
                "Por el Santo Padre, sus intenciones y la unidad de toda la Iglesia.",
                "Por la Fe, la Esperanza y la Caridad en nosotros y nuestras familias.",
                "Por nuestros proyectos personales y profesionales, para que provean con dignidad el sustento de nuestros hogares.",
                "Por el fin del aborto y la eutanasia, y por el consuelo de quienes sufren persecución o tortura por su fe.",
                "Por nuestras familias, para que en ellas reinen siempre la paz, la unidad y el amor cristiano.",
                "Por la salud de los enfermos, especialmente por aquellos con enfermedades graves o terminales.",
                "Por el descanso eterno de las almas del Purgatorio; que brille para ellas la luz eterna de tu Gloria.",
            ],
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
        mariaMadreGracia: {
            title: "María, Madre de Gracia",
            text: "María, Madre de gracia, Madre de misericordia, defiéndenos de nuestros enemigos y ampáranos ahora y en la hora de nuestra muerte. Amén.",
        },
        stJoseph: {
            title: "Castísimo San José",
            versicle: "Castísimo San José",
            response: "R. Ruega por nosotros.",
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
            intro: "Lord Jesus Christ, I offer you this Holy Rosary for the following intentions:",
            intentions: [
                "For the Holy Father, his intentions, and the unity of the whole Church.",
                "For the increase of Faith, Hope, and Charity within ourselves and our families.",
                "For our personal and professional projects, that they may worthily provide for the sustenance of our families.",
                "For the end of abortion and euthanasia, and for the comfort of those suffering persecution or torture for their faith.",
                "For our families, that peace, unity, and Christian love may always reign within them.",
                "For the health of the sick, especially those suffering from severe illnesses.",
                "For the eternal rest of the souls in Purgatory; let perpetual light shine upon them in your Glory.",
            ],
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
        mariaMadreGracia: {
            title: "Mary, Mother of Grace",
            text: "Mary, Mother of grace, Mother of mercy, defend us from our enemies and protect us now and at the hour of our death. Amen.",
        },
        stJoseph: {
            title: "Most Chaste Saint Joseph",
            versicle: "Most chaste Saint Joseph",
            response: "R. Pray for us.",
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
                { title: "La Anunciación", scripture: "Lucas 1, 31", verse: "«Vas a concebir en el seno y vas a dar a luz un hijo, a quien pondrás por nombre Jesús.»", fruit: "La fe y la humildad.", meditation: "Contemplamos el «Sí» de María. En un mundo de ruidos y soberbia, pedimos la gracia de escuchar la voluntad de Dios y aceptarla con sencillez." },
                { title: "La Visitación", scripture: "Lucas 1, 41", verse: "«En cuanto Isabel oyó el saludo de María, el niño saltó de gozo en su seno e Isabel quedó llena del Espíritu Santo.»", fruit: "El amor al prójimo (caridad).", meditation: "María sale de sí misma para servir a su prima. Meditamos en nuestra capacidad de ayudar a los demás sin que nos lo pidan." },
                { title: "El Nacimiento de Jesús", scripture: "Lucas 2, 7", verse: "«Y dio a luz a su hijo primogénito, lo envolvió en pañales y lo acostó en un pesebre.»", fruit: "La pobreza y la humildad.", meditation: "El Rey del Universo nace en la pobreza absoluta. Pedimos no ser esclavos de las cosas materiales y valorar lo que realmente importa: la presencia de Dios." },
                { title: "La Presentación en el Templo", scripture: "Lucas 2, 22", verse: "«Llevaron al niño a Jerusalén para presentarlo al Señor, como está escrito en la Ley.»", fruit: "La pureza y la obediencia.", meditation: "María y José cumplen la ley con amor. Meditamos en la importancia de ser fieles a nuestros compromisos y mantener un corazón limpio." },
                { title: "El Niño Perdido y Hallado en el Templo", scripture: "Lucas 2, 46", verse: "«Al cabo de tres días lo encontraron en el Templo sentado en medio de los maestros.»", fruit: "El gozo de encontrar a Jesús.", meditation: "¿Cuántas veces perdemos a Jesús por nuestras distracciones o pecados? Meditamos en la alegría de volver a encontrarlo en la Eucaristía y la oración." },
            ],
        },
        en: {
            label: "Joyful Mysteries",
            mysteries: [
                { title: "The Annunciation", scripture: "Luke 1:31", verse: "\"You will conceive in your womb and bear a son, and you shall name him Jesus.\"", fruit: "Faith and humility.", meditation: "We contemplate Mary's \"Yes.\" In a world of noise and pride, we ask for the grace to listen to God's will and accept it with simplicity." },
                { title: "The Visitation", scripture: "Luke 1:41", verse: "\"When Elizabeth heard Mary's greeting, the child leapt in her womb, and Elizabeth was filled with the Holy Spirit.\"", fruit: "Love of neighbor (charity).", meditation: "Mary steps out of herself to serve her cousin. We meditate on our willingness to help others without being asked." },
                { title: "The Nativity", scripture: "Luke 2:7", verse: "\"She gave birth to her firstborn son. She wrapped him in swaddling clothes and laid him in a manger.\"", fruit: "Poverty and humility.", meditation: "The King of the Universe is born in utter poverty. We ask not to be enslaved by material things, and to value what truly matters: God's presence." },
                { title: "The Presentation in the Temple", scripture: "Luke 2:22", verse: "\"They took him up to Jerusalem to present him to the Lord, as it is written in the Law.\"", fruit: "Purity and obedience.", meditation: "Mary and Joseph fulfill the Law with love. We meditate on faithfulness to our commitments and on keeping a clean heart." },
                { title: "The Finding in the Temple", scripture: "Luke 2:46", verse: "\"After three days they found him in the Temple, sitting among the teachers.\"", fruit: "The joy of finding Jesus again.", meditation: "How often do we lose Jesus through our distractions or sins? We meditate on the joy of finding him again in the Eucharist and in prayer." },
            ],
        },
    },
    sorrowful: {
        es: {
            label: "Misterios Dolorosos",
            mysteries: [
                { title: "La Oración en el Huerto", scripture: "Lucas 22, 44", verse: "«Sumido en agonía, insistía más en su oración. Su sudor se hizo como gotas espesas de sangre.»", fruit: "La entrega a la voluntad de Dios.", meditation: "Jesús sufre por nuestra falta de amor. Meditamos en la importancia de acompañar al Señor en los momentos de prueba y oscuridad." },
                { title: "La Flagelación", scripture: "Juan 19, 1", verse: "«Pilato tomó entonces a Jesús y mandó azotarle.»", fruit: "La mortificación de los sentidos.", meditation: "Contemplamos el sacrificio físico de Jesús. Pedimos la gracia de ser pacientes en nuestros sufrimientos y enfermedades diarias." },
                { title: "La Coronación de Espinas", scripture: "Juan 19, 2", verse: "«Los soldados trenzaron una corona de espinas, se la pusieron en la cabeza y le vistieron un manto de púrpura.»", fruit: "El valor moral contra la opinión del mundo.", meditation: "Jesús es humillado por nosotros. Meditamos en cuántas veces buscamos el aplauso de los demás en lugar de la aprobación de Dios." },
                { title: "Jesús carga con la Cruz", scripture: "Juan 19, 17", verse: "«Y cargando él mismo con la cruz, salió hacia el lugar llamado Calvario.»", fruit: "La paciencia ante las dificultades.", meditation: "Todos tenemos una cruz. Al meditar este misterio, pedimos la fuerza para no rendirnos y seguir caminando a pesar del peso de nuestras responsabilidades." },
                { title: "La Crucifixión y Muerte", scripture: "Lucas 23, 46", verse: "«Jesús, dando un fuerte grito, dijo: “Padre, en tus manos encomiendo mi espíritu”.»", fruit: "La aceptación de la muerte, la salvación y el perdón.", meditation: "La muerte de Jesús es el acto de amor más grande de la historia. Meditamos en la importancia de perdonar a quienes nos han ofendido." },
            ],
        },
        en: {
            label: "Sorrowful Mysteries",
            mysteries: [
                { title: "The Agony in the Garden", scripture: "Luke 22:44", verse: "\"In his anguish he prayed more earnestly, and his sweat became like drops of blood.\"", fruit: "Surrender to the will of God.", meditation: "Jesus suffers for our lack of love. We meditate on the importance of accompanying the Lord in moments of trial and darkness." },
                { title: "The Scourging at the Pillar", scripture: "John 19:1", verse: "\"Then Pilate took Jesus and had him scourged.\"", fruit: "Mortification of the senses.", meditation: "We contemplate the physical sacrifice of Jesus. We ask for the grace to be patient in our daily sufferings and illnesses." },
                { title: "The Crowning with Thorns", scripture: "John 19:2", verse: "\"The soldiers wove a crown of thorns and placed it on his head, and they clothed him in a purple robe.\"", fruit: "Moral courage against the opinion of the world.", meditation: "Jesus is humiliated for us. We meditate on how often we seek the applause of others rather than the approval of God." },
                { title: "Jesus Carries the Cross", scripture: "John 19:17", verse: "\"Carrying the cross by himself, he went out to the place called Calvary.\"", fruit: "Patience in the face of hardship.", meditation: "We all carry a cross. We ask for the strength not to give up, and to keep walking despite the weight of our responsibilities." },
                { title: "The Crucifixion and Death", scripture: "Luke 23:46", verse: "\"Then Jesus, crying with a loud voice, said, 'Father, into your hands I commend my spirit.'\"", fruit: "Acceptance of death, salvation, and forgiveness.", meditation: "The death of Jesus is the greatest act of love in history. We meditate on the importance of forgiving those who have offended us." },
            ],
        },
    },
    glorious: {
        es: {
            label: "Misterios Gloriosos",
            mysteries: [
                { title: "La Resurrección", scripture: "Mateo 28, 6", verse: "«No está aquí, porque ha resucitado, como había dicho.»", fruit: "La fe.", meditation: "La victoria definitiva sobre la muerte. Pedimos una fe inquebrantable que nos dé esperanza incluso en las situaciones que parecen imposibles." },
                { title: "La Ascensión", scripture: "Marcos 16, 19", verse: "«El Señor Jesús, después de hablarles, fue elevado al cielo y se sentó a la diestra de Dios.»", fruit: "La esperanza y el deseo del cielo.", meditation: "Nuestra verdadera patria está en el cielo. Meditamos en que nuestra vida en la tierra es un camino de preparación para el encuentro eterno con Dios." },
                { title: "La Venida del Espíritu Santo", scripture: "Hechos 2, 3-4", verse: "«Se les aparecieron unas lenguas como de fuego… y quedaron todos llenos del Espíritu Santo.»", fruit: "La oración y docilidad al Espíritu Santo.", meditation: "Pedimos al Espíritu Santo que nos ilumine para hablar de Dios con valentía y actuar con sabiduría en nuestro trabajo y familia." },
                { title: "La Asunción de María", scripture: "Lucas 1, 45", verse: "«¡Dichosa tú que has creído, porque se cumplirá lo que te fue dicho de parte del Señor!»", fruit: "La gracia de una muerte feliz.", meditation: "María es llevada al cielo. Meditamos en que ella es nuestra madre y nos espera para llevarnos de la mano hacia su Hijo." },
                { title: "La Coronación de María", scripture: "Apocalipsis 12, 1", verse: "«Una gran señal apareció en el cielo: una mujer vestida del sol, con la luna bajo sus pies y una corona de doce estrellas.»", fruit: "La devoción a María.", meditation: "María es Reina del Universo. Confiamos nuestras preocupaciones a su intercesión poderosa." },
            ],
        },
        en: {
            label: "Glorious Mysteries",
            mysteries: [
                { title: "The Resurrection", scripture: "Matthew 28:6", verse: "\"He is not here; he has been raised, as he said.\"", fruit: "Faith.", meditation: "The definitive victory over death. We ask for an unshakable faith that gives us hope even in situations that seem impossible." },
                { title: "The Ascension", scripture: "Mark 16:19", verse: "\"After speaking to them, the Lord Jesus was taken up into heaven and sat down at the right hand of God.\"", fruit: "Hope and desire for heaven.", meditation: "Our true homeland is in heaven. We meditate that our life on earth is a path of preparation for the eternal encounter with God." },
                { title: "The Descent of the Holy Spirit", scripture: "Acts 2:3-4", verse: "\"Tongues, as of fire, appeared among them… and all were filled with the Holy Spirit.\"", fruit: "Prayer and docility to the Holy Spirit.", meditation: "We ask the Holy Spirit to enlighten us, to speak of God with courage and to act with wisdom in our work and family." },
                { title: "The Assumption of Mary", scripture: "Luke 1:45", verse: "\"Blessed is she who believed that there would be a fulfillment of what was spoken to her by the Lord.\"", fruit: "The grace of a happy death.", meditation: "Mary is taken up into heaven. We meditate that she is our Mother and waits to lead us by the hand to her Son." },
                { title: "The Coronation of Mary", scripture: "Revelation 12:1", verse: "\"A great sign appeared in heaven: a woman clothed with the sun, with the moon under her feet and a crown of twelve stars.\"", fruit: "Devotion to Mary.", meditation: "Mary is Queen of the Universe. We entrust our concerns to her powerful intercession." },
            ],
        },
    },
    luminous: {
        es: {
            label: "Misterios Luminosos",
            mysteries: [
                { title: "El Bautismo en el Jordán", scripture: "Mateo 3, 16-17", verse: "«Una vez bautizado… se abrieron los cielos y vio al Espíritu de Dios que bajaba como una paloma y se posaba sobre Él. Al mismo tiempo se oyó una voz del cielo que decía: “Este es mi Hijo, el Amado; éste es mi Elegido”.»", fruit: "Arrepentimiento y perdón.", meditation: "Renovamos nuestro compromiso de vivir como verdaderos cristianos en medio del mundo." },
                { title: "Las Bodas de Caná", scripture: "Juan 2, 5", verse: "«Dice su madre a los sirvientes: “Haced lo que él os diga”.»", fruit: "La confianza en la intercesión de María.", meditation: "Jesús transforma el agua en vino por petición de su madre. Aprendemos a confiar en que María conoce nuestras necesidades antes que nosotros." },
                { title: "El Anuncio del Reino de Dios", scripture: "Marcos 1, 15", verse: "«El tiempo se ha cumplido y el Reino de Dios está cerca; convertíos y creed en el Evangelio.»", fruit: "El deseo de conversión y obediencia.", meditation: "Pedimos la gracia de cambiar de vida cada día y ser testigos de la alegría de Dios ante los demás." },
                { title: "La Transfiguración", scripture: "Mateo 17, 2", verse: "«Su rostro resplandeció como el sol y sus vestidos se volvieron blancos como la luz.»", fruit: "La santidad.", meditation: "En la oración, Dios nos transforma. Meditamos en la necesidad de apartarnos del ruido del mundo para escuchar la voz del Padre." },
                { title: "La Institución de la Eucaristía", scripture: "Lucas 22, 19", verse: "«Tomó pan, dio gracias, lo partió y se lo dio diciendo: “Este es mi cuerpo, que es entregado por vosotros”.»", fruit: "El amor a la Eucaristía.", meditation: "Jesús se queda con nosotros para siempre. Meditamos en el valor infinito de cada Misa y de la presencia real de Cristo en el sagrario." },
            ],
        },
        en: {
            label: "Luminous Mysteries",
            mysteries: [
                { title: "The Baptism in the Jordan", scripture: "Matthew 3:16-17", verse: "\"When Jesus had been baptized… the heavens were opened and he saw the Spirit of God descending like a dove and alighting on him; and a voice from heaven said, 'This is my Son, the Beloved; with him I am well pleased.'\"", fruit: "Repentance and forgiveness.", meditation: "We renew our commitment to live as true Christians in the midst of the world." },
                { title: "The Wedding at Cana", scripture: "John 2:5", verse: "\"His mother said to the servants, 'Do whatever he tells you.'\"", fruit: "Trust in Mary's intercession.", meditation: "Jesus turns water into wine at his mother's request. We learn to trust that Mary knows our needs before we do." },
                { title: "The Proclamation of the Kingdom", scripture: "Mark 1:15", verse: "\"The time is fulfilled, and the kingdom of God has come near; repent, and believe in the good news.\"", fruit: "Desire for conversion and obedience.", meditation: "We ask for the grace to change our lives each day and to be witnesses of God's joy before others." },
                { title: "The Transfiguration", scripture: "Matthew 17:2", verse: "\"His face shone like the sun, and his clothes became dazzling white.\"", fruit: "Holiness.", meditation: "In prayer, God transforms us. We meditate on the need to step away from the world's noise to listen to the voice of the Father." },
                { title: "The Institution of the Eucharist", scripture: "Luke 22:19", verse: "\"He took bread, gave thanks, broke it and gave it to them, saying, 'This is my body, which is given for you.'\"", fruit: "Love for the Eucharist.", meditation: "Jesus stays with us forever. We meditate on the infinite value of each Mass and the real presence of Christ in the tabernacle." },
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
    slides.push({
        kind: "offering",
        title: c.offering.title,
        intro: c.offering.intro,
        intentions: c.offering.intentions,
    });
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
            verse: m.verse,
            fruit: m.fruit,
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
            kind: "postDecade",
            items: [
                { title: c.gloryBe.title, text: c.gloryBe.text },
                { title: c.fatima.title, text: c.fatima.text },
                { title: c.mariaMadreGracia.title, text: c.mariaMadreGracia.text },
                {
                    title: c.stJoseph.title,
                    versicle: c.stJoseph.versicle,
                    response: c.stJoseph.response,
                },
            ],
        });
    });

    slides.push({ kind: "prayer", title: c.hailHolyQueen.title, text: c.hailHolyQueen.text });
    slides.push({ kind: "prayer", title: c.closing.title, text: c.closing.text });
    slides.push({ kind: "prayer", title: c.signCross.title, text: c.signCross.text });
    slides.push({ kind: "end", label: set.label });

    return slides;
}
