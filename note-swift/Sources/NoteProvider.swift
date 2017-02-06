import Foundation

class NoteProvider : Note_TranslationServiceProvider {

  // Translate the note to Chinese
  func translate(request : Note_Note, session : Note_TranslationServicetranslateSession) throws -> Note_Note {
    return Note_Note(
      id: request.id,
      title: request.title,
      content:"Swift transation: " + request.content
    )
  }
}
