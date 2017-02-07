import Foundation

class NoteProvider : Note_TranslationServiceProvider {

  // Translate the note to Chinese
  func translate(request : Note_Note, session : Note_TranslationServicetranslateSession) throws -> Note_Note {
    print("Request: " + String(describing:request));
    var content = request.content;
    if (content == "string") {
      content = "字符串";
    }
    return Note_Note(
      id: request.id,
      title: request.title,
      content: "Swift<" + content + ">"
    );
  }
}
