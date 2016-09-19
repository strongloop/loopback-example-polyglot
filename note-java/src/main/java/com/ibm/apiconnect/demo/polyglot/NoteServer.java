package com.ibm.apiconnect.demo.polyglot;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.ServerServiceDefinition;
import io.grpc.stub.StreamObserver;

/**
 * Server that manages startup/shutdown of a {@code NoteService} server.
 */
public class NoteServer {

	public NoteServer() {
		this(50052, BraveUtil.ZIPKIN_SERVER_URL);
	}

	public NoteServer(int port, String zipkinServerUrl) {
		super();
		this.port = port;
		this.zipkinServerUrl = zipkinServerUrl;
	}

	private static final Logger logger = Logger.getLogger(NoteServer.class.getName());

	/* The port on which the server should run */
	private int port = 50052;

	private String zipkinServerUrl = BraveUtil.ZIPKIN_SERVER_URL;
	private Server server;
	private RSAPrivateKey privateKey;
	private RSAPublicKey publicKey;

	private void start() throws Exception {
		this.privateKey = JWEUtil.loadPrivateKey();
		this.publicKey = JWEUtil.loadPublicKey();
		ServerServiceDefinition noteService = BraveUtil.intercept(new NoteServiceImpl(), "note-service",
				zipkinServerUrl);
		ServerServiceDefinition encryptionService = BraveUtil.intercept(new EncryptioneServiceImpl(),
				"encryption-service", zipkinServerUrl);
		server = ServerBuilder.forPort(port).addService(noteService).addService(encryptionService).build().start();
		logger.info("Server started, listening on " + port);
		Runtime.getRuntime().addShutdownHook(new Thread() {
			@Override
			public void run() {
				// Use stderr here since the logger may have been reset by its
				// JVM shutdown hook.
				System.err.println("*** shutting down gRPC server since JVM is shutting down");
				NoteServer.this.stop();
				System.err.println("*** server shut down");
			}
		});
	}

	private void stop() {
		if (server != null) {
			server.shutdown();
		}
	}

	/**
	 * Await termination on the main thread since the grpc library uses daemon
	 * threads.
	 */
	private void blockUntilShutdown() throws InterruptedException {
		if (server != null) {
			server.awaitTermination();
		}
	}

	/**
	 * Main launches the server from the command line.
	 */
	public static void main(String[] args) throws Exception {
		final NoteServer server = new NoteServer();
		server.start();
		server.blockUntilShutdown();
	}

	private static List<Note> notes = new ArrayList<Note>();
	private static volatile int index = 0;

	private class NoteServiceImpl extends NoteServiceGrpc.NoteServiceImplBase {

		@Override
		public void create(Note req, StreamObserver<Note> responseObserver) {
			Note reply = Note.newBuilder(req).setId(++index).build();
			notes.add(reply);
			responseObserver.onNext(reply);
			responseObserver.onCompleted();
		}

		public void findById(com.ibm.apiconnect.demo.polyglot.FindByIdRequest request,
				io.grpc.stub.StreamObserver<com.ibm.apiconnect.demo.polyglot.Note> responseObserver) {
			Note found = null;
			for (Note n : notes) {
				if (n.getId() == request.getId()) {
					found = n;
					break;
				}
			}
			responseObserver.onNext(found);
			responseObserver.onCompleted();
		}

		/**
		 */
		public void find(com.ibm.apiconnect.demo.polyglot.FindRequest request,
				io.grpc.stub.StreamObserver<com.ibm.apiconnect.demo.polyglot.FindResponse> responseObserver) {
			FindResponse reply = FindResponse.newBuilder().addAllNotes(notes).build();
			responseObserver.onNext(reply);
			responseObserver.onCompleted();
		}
	}

	private class EncryptioneServiceImpl extends EncryptionServiceGrpc.EncryptionServiceImplBase {

		@Override
		public void encrypt(Note req, StreamObserver<Note> responseObserver) {
			String content = req.getContent();
			try {
				logger.info("Encrypting: " + content);
				content = JWEUtil.generateJWE(content, publicKey);
			} catch (Exception e) {
				responseObserver.onError(e);
				return;
			}

			Note reply = Note.newBuilder(req).setContent(content).build();
			responseObserver.onNext(reply);
			responseObserver.onCompleted();
		}

		@Override
		public void decrypt(Note req, StreamObserver<Note> responseObserver) {
			String content = req.getContent();
			try {
				logger.info("Decrypting: " + content);
				content = JWEUtil.decrypt(content, privateKey);
			} catch (Exception e) {
				responseObserver.onError(e);
				return;
			}

			Note reply = Note.newBuilder(req).setContent(content).build();
			responseObserver.onNext(reply);
			responseObserver.onCompleted();
		}
	}
}
