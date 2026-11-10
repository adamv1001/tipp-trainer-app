/* Lektionen und Texte – alle Texte selbst erstellt */
(function (root) {
"use strict";
function L(id, title, level, kind, keys, text, extra) {
  var o = { id: id, title: title, level: level, kind: kind, keys: keys, text: text };
  if (extra) for (var k in extra) o[k] = extra[k];
  return o;
}
var LESSONS = [
  L("l01","Grundstellung links: a s d f",1,"neu","asdf","asdf fdsa asdf fdsa aaa sss ddd fff as df fa sa da fad add sad dass sass"),
  L("l02","Grundstellung rechts: j k l ö",1,"neu","jklö","jklö ölkj jklö ölkj jjj kkk lll ööö lök köl jöl klö lö jö kö"),
  L("l03","Beide Hände und Leertaste",1,"neu","asdfjklö ","asdf jklö fdsa ölkj as df jk lö als das fall kalk saal all lass fad"),
  L("l04","Neu: e und i",1,"neu","ei","eee iii ded kik fed lid die sie sei eile seile leise feld fiel dies idea eies"),
  L("l05","Neu: r und u",1,"neu","ru","rrr uuu frf juj ruf kur drei feuer reise alle rufe das rad sei leise"),
  L("l06","Neu: t und n",1,"neu","tn","ttt nnn ftf jnj und nun tante nein eine nuss teile rennen nisten rund treu"),
  L("l07","Wiederholung 1",1,"wdh","asdfjklöeirutn","ein kleiner fluss ist tief und leise die tante liest alle drei sind da er fand eine nuss und rief laut"),
  L("l08","Neu: g und h",2,"neu","gh","ggg hhh fgf jhj gas hase haus gehe sage geld hier hungrig garten huhn"),
  L("l09","Neu: w und o",2,"neu","wo","www ooo sws lol wo wie wald wort hose ohr sofa wolke sohn sonne"),
  L("l10","Neu: q und p",2,"neu","qp","qqq ppp aqa ölp quark papa post opa quelle puppe paket park quer"),
  L("l11","Neu: c und m",2,"neu","cm","ccc mmm dcd jmj mama milch dach ich auch mich macht scheck milde"),
  L("l12","Neu: v und z",2,"neu","vz","vvv zzz fvf jzj vier vogel vase zeit herz zahl kurz zehn ganz"),
  L("l13","Neu: b und y",2,"neu","by","bbb yyy fbf aya baby boot bild yoga typ ball bunt typisch bzw"),
  L("l14","Neu: x und Komma",2,"neu","x,","xxx ,,, sxs k,k fix, box, hexe, taxi, axt, text, mix, max,"),
  L("l15","Neu: Punkt und Minus",2,"neu",".-","... --- l.l ö-ö ende. ja. nein. ost-west. hin-her. so. los."),
  L("l16","Wiederholung 2",2,"wdh","abcdefghijklmnopqrstuvwxyzö,.-","wir packen eine box mit quark, milch und zwei vasen. der hund bellt nicht. heute ist es warm."),
  L("l17","Prüfung: alle Kleinbuchstaben",2,"pruefung","alle","ein vogel fliegt ueber das blaue meer. wir tippen jetzt mit zehn fingern. jeder buchstabe hat seinen platz.",{exam:true}),
L("l18","Umlaute: ä ö ü",3,"neu","äöü","äää ööö üüü äöü öl äpfel über müde bär schön grün tür mädchen"),
  L("l19","Neu: ß",3,"neu","ß","ßßß süß groß fuß maß weiß straße grüße heißen fleißig"),
  L("l20","Großschreibung links (Shift rechts)",3,"neu","Shift","Anna Dora Erik Fritz Greta Sara Tim Willi Anton Emma"),
  L("l21","Großschreibung rechts (Shift links)",3,"neu","Shift","Jana Karl Lena Max Nina Otto Paul Udo Inga Hanna"),
  L("l22","Wörter mit Großbuchstaben",3,"wdh","Shift","Der Hund und die Katze spielen im Garten. Die Sonne scheint. Wir essen Kuchen."),
  L("l23","Zahlen 1 bis 5",3,"neu","12345","111 222 333 444 555 12 23 34 45 51 3 Hefte, 2 Stifte, 5 Bücher, 4 Äpfel"),
  L("l24","Zahlen 6 bis 0",3,"neu","67890","666 777 888 999 000 67 78 89 90 60 Seite 70, 8 Kinder, 90 Minuten, 6 Uhr"),
  L("l25","Satzzeichen ! ? : ;",4,"neu","!?:;","Wie spät ist es? Toll! Achtung: Pause. Ja; nein; vielleicht. Wer kommt mit? Super!"),
  L("l26","Anführungszeichen und Klammern",4,"neu","\"()","Sie sagt: \"Hallo!\" Er antwortet (leise): \"Guten Morgen.\" (Das ist neu.)"),
  L("l27","Sonderzeichen @ € & / %",4,"neu","@€&/%","mail@schule.de 5 € Kakao & Kuchen 1/2 Stunde 50 % fertig team@verein.de"),
  L("l28","Häufige Wörter",4,"woerter","Wörter","und die der das ist nicht ein eine sie ich wir auch mit auf für von zu den sich es"),
  L("l29","Kurze Sätze",4,"saetze","Sätze","Ich tippe ruhig und genau. Meine Finger kennen den Weg. Fehler sind nicht schlimm. Übung macht Spaß."),
  L("l30","Schule",4,"saetze","Schule","Heute haben wir Mathe, Deutsch und Englisch. In der Pause essen wir ein Brot. Die Hausaufgaben sind fertig."),
  L("l31","Wiederholung 3",5,"wdh","alles","Am Montag um 8 Uhr beginnt die Schule. Lisa (11) bringt 3 Bücher mit. Kostet das 4,50 €? Ja!"),
  L("l32","Geschichte: Der kleine Fuchs",5,"text","Text","Ein kleiner Fuchs wohnte am Rand eines großen Waldes. Jeden Morgen lief er zum Bach und trank klares Wasser. Eines Tages fand er dort einen glänzenden Stein. Er nahm ihn vorsichtig ins Maul und trug ihn nach Hause. Seitdem nennt man ihn den Fuchs mit dem Schatz."),
  L("l33","Geschichte: Die Reise zum Mond",5,"text","Text","Mia baute aus Kartons eine Rakete. Sie malte Fenster, Sterne und einen roten Knopf. Als sie den Knopf drückte, zählte sie laut: drei, zwei, eins, los! In ihrer Fantasie flog sie bis zum Mond und winkte der Erde zu. Zum Abendessen war sie natürlich wieder pünktlich zurück."),
  L("l34","Prüfung: Schluss-Text",5,"pruefung","alles","Wer täglich zehn Minuten übt, wird schnell sicherer. Achte auf deine Haltung: Schultern locker, Handgelenke gerade, Blick auf den Text. Nach 4 Wochen tippst du vielleicht schon doppelt so schnell. Viel Erfolg!",{exam:true})
];

var TEXTS = {
  alltag: { title: "Alltag", lang: "de", items: [
    "Am Morgen klingelt der Wecker. Ich stehe auf, wasche mich und ziehe mich an. Zum Frühstück gibt es Brot mit Honig und einen warmen Tee.",
    "Wir gehen heute einkaufen. Auf dem Zettel stehen Milch, Eier, Nudeln, Tomaten und Äpfel. Der Laden ist gleich um die Ecke.",
    "Am Wochenende fahren wir mit dem Rad an den See. Dort machen wir Picknick, spielen Ball und schauen den Enten zu."
  ]},
  schule: { title: "Schule", lang: "de", items: [
    "In Mathe rechnen wir heute mit Brüchen. Ein Viertel plus ein Viertel ergibt ein Halb. Das ist gar nicht so schwer.",
    "Für das Referat suche ich Bilder und schreibe fünf wichtige Sätze auf. Am Ende übe ich den Vortrag vor dem Spiegel.",
    "Unsere Klasse plant einen Ausflug in das Museum. Jeder bringt ein Pausenbrot und eine Trinkflasche mit."
  ]},
  geschichten: { title: "Geschichten", lang: "de", items: [
    "Der Drache Fridolin hatte Angst vor Feuer. Statt Flammen pustete er bunte Seifenblasen. Die Kinder im Dorf liebten ihn dafür.",
    "Eine Eule namens Ida konnte nachts nicht schlafen. Also zählte sie die Sterne. Bei Stern Nummer hundert fielen ihr endlich die Augen zu.",
    "Im Keller fand Ben eine alte Kiste. Darin lag eine Karte mit einem roten Kreuz. Ob dort wohl ein Schatz versteckt ist?"
  ]},
  zahlen: { title: "Zahlen & Zeichen", lang: "de", items: [
    "Der Bus fährt um 7:45 Uhr. Die Fahrt dauert 25 Minuten und kostet 2,10 €. Die Haltestelle ist in der Hauptstraße 12.",
    "Bestellung Nr. 4711: 3 Hefte (A4), 2 Bleistifte, 1 Lineal = 6,80 €. Lieferung bis 15.11.!",
    "Rechnung: 12 + 8 = 20; 50 - 15 = 35; 6 * 7 = 42; 81 / 9 = 9. Alles richtig? Ja, 100 %!"
  ]},
  code: { title: "Programmier-Zeichen", lang: "de", items: [
    "if (x > 3) { print(\"groß\"); } else { print(\"klein\"); }",
    "let liste = [1, 2, 3]; liste.push(4); // jetzt vier",
    "mail = \"anna@beispiel.de\"; pfad = \"C:\\\\Daten\\\\notiz.txt\"; url = \"https://example.org/a/b\";"
  ]},
  english: { title: "English", lang: "en", items: [
    "My name is Lucy and I live in a small town. I have got a cat called Tiger. On Saturdays I play football with my friends.",
    "Yesterday we visited a castle. The walls were very old and the towers were high. We took a lot of photos and had ice cream.",
    "Can you help me, please? I am looking for the station. Go straight on, then turn left at the bakery. It is next to the bank."
  ]}
};

var LEVEL_NAMES = { 1: "Stufe 1 – Grundlagen", 2: "Stufe 2 – Alle Buchstaben", 3: "Stufe 3 – Umlaute, Groß, Zahlen", 4: "Stufe 4 – Zeichen & Wörter", 5: "Stufe 5 – Texte & Prüfung" };
var KIND_NAMES = { neu: "Neue Tasten", wdh: "Wiederholung", pruefung: "Prüfung", woerter: "Wörter", saetze: "Sätze", text: "Text" };

var GAME_WORDS = {
  de: ["haus","baum","katze","hund","sonne","mond","stern","buch","heft","stift","ball","rad","see","berg","wald","blume","apfel","brot","milch","käse","tür","fuß","süß","groß","schön","grün","blau","rot","gelb","weiß","schule","pause","lesen","tippen","finger","taste","maus","bild","lied","spiel"],
  en: ["cat","dog","sun","moon","star","book","pen","ball","tree","house","apple","bread","milk","green","blue","red","school","friend","happy","play","read","write","music","water","river","town","train","beach","ice","cake"]
};

var api = { LESSONS: LESSONS, TEXTS: TEXTS, LEVEL_NAMES: LEVEL_NAMES, KIND_NAMES: KIND_NAMES, GAME_WORDS: GAME_WORDS };
if (typeof module !== "undefined" && module.exports) module.exports = api;
else root.TippData = api;
})(typeof self !== "undefined" ? self : this);
