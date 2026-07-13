import { Word } from "./types";

// A sample lesson with rich word data for testing all game formats.
// Words have multiple aspects (alt forms, synonyms, definitions, explanations,
// sentences) so that difficulty 3/4 formats (which need 4+ unique aspects)
// can be served.
export const SAMPLE_LESSON = {
  name: "Spanish Essentials (Sample)",
  words: [
    {
      word: "ser",
      translation: "to be",
      definition: "verbo de existencia o identidad",
      synonym: "=existir",
      explanation: "Used for permanent states, identity, and characteristics.",
      alt1: "soy",
      alt2: "eres",
      alt3: "es",
      sentences: [
        {
          exert: "Yo [I] soy [am] estudiante [student].",
          translation: "I am a student.",
        },
        {
          exert: "Ella [She] es [is] doctora [doctor].",
          translation: "She is a doctor.",
        },
      ],
    },
    {
      word: "tener",
      translation: "to have",
      definition: "verbo de posesion",
      synonym: "=poseer",
      explanation: "Used to express possession, age, and obligations.",
      alt1: "tengo",
      alt2: "tienes",
      alt3: "tiene",
      sentences: [
        {
          exert: "Yo [I] tengo [have] un [a] perro [dog].",
          translation: "I have a dog.",
        },
        {
          exert: "Tienes [You have] razon [right].",
          translation: "You are right.",
        },
      ],
    },
    {
      word: "ir",
      translation: "to go",
      definition: "verbo de movimiento",
      synonym: "=caminar",
      explanation: "Used to express movement toward a destination.",
      alt1: "voy",
      alt2: "vas",
      alt3: "va",
      sentences: [
        {
          exert: "Voy [I go] a [to] la [the] escuela [school].",
          translation: "I go to school.",
        },
        {
          exert: "Vamos [We go] al [to the] parque [park].",
          translation: "We go to the park.",
        },
      ],
    },
    {
      word: "hacer",
      translation: "to do",
      definition: "verbo de accion",
      synonym: "=realizar",
      explanation: "Used for creating, performing, or making something.",
      alt1: "hago",
      alt2: "haces",
      alt3: "hace",
      sentences: [
        {
          exert: "Hago [I do] la [the] tarea [homework].",
          translation: "I do the homework.",
        },
        {
          exert: "Que [What] haces [you do] hoy [today]?",
          translation: "What do you do today?",
        },
      ],
    },
    {
      word: "decir",
      translation: "to say",
      definition: "verbo de comunicacion",
      synonym: "=hablar",
      explanation: "Used to express speech or to tell something.",
      alt1: "digo",
      alt2: "dices",
      alt3: "dice",
      sentences: [
        {
          exert: "Digo [I say] la [the] verdad [truth].",
          translation: "I say the truth.",
        },
        {
          exert: "Que [What] dices [you say]?",
          translation: "What do you say?",
        },
      ],
    },
    {
      word: "ver",
      translation: "to see",
      definition: "verbo de percepcion visual",
      synonym: "=mirar",
      explanation: "Used for visual perception.",
      alt1: "veo",
      alt2: "ves",
      alt3: "ve",
      sentences: [
        {
          exert: "Veo [I see] la [the] luna [moon].",
          translation: "I see the moon.",
        },
        {
          exert: "Vemos [We see] las [the] estrellas [stars].",
          translation: "We see the stars.",
        },
      ],
    },
    {
      word: "comer",
      translation: "to eat",
      definition: "verbo de ingestion",
      synonym: "=alimentarse",
      explanation: "Used for consuming food.",
      alt1: "como",
      alt2: "comes",
      alt3: "come",
      sentences: [
        {
          exert: "Como [I eat] pan [bread] y [and] queso [cheese].",
          translation: "I eat bread and cheese.",
        },
      ],
    },
    {
      word: "beber",
      translation: "to drink",
      definition: "verbo de ingestion de liquidos",
      synonym: "=tomar",
      explanation: "Used for consuming liquids.",
      alt1: "bebo",
      alt2: "bebes",
      alt3: "bebe",
      sentences: [
        {
          exert: "Bebo [I drink] agua [water] fresca [fresh].",
          translation: "I drink fresh water.",
        },
      ],
    },
    {
      word: "vivir",
      translation: "to live",
      definition: "verbo de existencia",
      synonym: "=habitar",
      explanation: "Used for residing or being alive.",
      alt1: "vivo",
      alt2: "vives",
      alt3: "vive",
      sentences: [
        {
          exert: "Vivo [I live] en [in] Madrid [Madrid].",
          translation: "I live in Madrid.",
        },
      ],
    },
    {
      word: "dar",
      translation: "to give",
      definition: "verbo de transferencia",
      synonym: "=entregar",
      explanation: "Used for transferring something to someone.",
      alt1: "doy",
      alt2: "das",
      alt3: "da",
      sentences: [
        {
          exert: "Te [You] doy [I give] un [a] regalo [gift].",
          translation: "I give you a gift.",
        },
      ],
    },
  ] as Word[],
};
