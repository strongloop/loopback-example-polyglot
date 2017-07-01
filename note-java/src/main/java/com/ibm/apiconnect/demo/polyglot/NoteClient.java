package com.ibm.apiconnect.demo.polyglot;

import java.io.InputStream;
import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.net.ssl.SSLException;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;
import io.grpc.netty.GrpcSslContexts;
import io.grpc.netty.NettyChannelBuilder;

/**
 * A simple client that requests a note from the {@link NoteServer}.
 */
public class NoteClient {

	private static final Logger logger = Logger.getLogger(NoteClient.class.getName());

	private final ManagedChannel noteChannel;
	private final ManagedChannel encryptionChannel;
	private final NoteServiceGrpc.NoteServiceBlockingStub noteServiceStub;
	private final EncryptionServiceGrpc.EncryptionServiceBlockingStub encryptionServiceStub;

	/** Construct client connecting to Note server at {@code host:port}. 
	 * @throws SSLException */
	public NoteClient(String noteHost, int notePort, String encryptionHost, int encryptionPort) throws SSLException {
		InputStream keyCertChainInputStream = NoteClient.class.getResourceAsStream("/grpc.crt");
		noteChannel = ManagedChannelBuilder.forAddress(noteHost, notePort)
				// Channels are secure by default (via SSL/TLS). For the example
				// we disable TLS to avoid
				// needing certificates.
				.usePlaintext(true).build();
		encryptionChannel = NettyChannelBuilder.forAddress(encryptionHost, encryptionPort)
				// Channels are secure by default (via SSL/TLS). For the example
				// we disable TLS to avoid
				// needing certificates.
				.sslContext(GrpcSslContexts.forClient().trustManager(keyCertChainInputStream).build())
				.build();
		noteServiceStub = NoteServiceGrpc.newBlockingStub(noteChannel);
		encryptionServiceStub = EncryptionServiceGrpc.newBlockingStub(encryptionChannel);
	}

	public void shutdown() throws InterruptedException {
		noteChannel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
		encryptionChannel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
	}

	public Note create(int id) {
		Note request = Note.newBuilder().setId(id)
		    .setTitle("Note" + id).setContent("My Note: " + id).build();
		try {
			Note response = noteServiceStub.create(request);
			logger.info("Note created: " + response);
			return response;
		} catch (StatusRuntimeException e) {
			logger.log(Level.WARNING, "RPC failed: {0}", e.getStatus());
			return null;
		}
	}

	/**
	 * Greet server. If provided, the first element of {@code args} is the name
	 * to use in the note.
	 */
	public static void main(String[] args) throws Exception {
		NoteClient client = new NoteClient("note-loopback", 50051, "note-java", 50052);
		try {
		    int id = 1;
		    if (args.length >= 1) {
		        id = Integer.parseInt(args[0]);
		    }
			Note note = client.create(id);
			System.out.println("Created: " + note);
			if (note != null) {
				if (note.getContent().equals("My Note")) {
					note = client.encryptionServiceStub.encrypt(note);
					System.out.println("Encrypted: " + note);
				}
				note = client.encryptionServiceStub.decrypt(note);
				System.out.println("Decrypted:" + note);
			}
		} finally {
			client.shutdown();
		}
	}
}