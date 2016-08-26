package com.ibm.apiconnect.demo.polyglot;

import java.util.concurrent.TimeUnit;
import java.util.logging.Level;
import java.util.logging.Logger;

import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.StatusRuntimeException;

/**
 * A simple client that requests a note from the {@link NoteServer}.
 */
public class NoteClient {
	private static final Logger logger = Logger.getLogger(NoteClient.class.getName());

	private final ManagedChannel channel;
	private final NoteServiceGrpc.NoteServiceBlockingStub blockingStub;

	/** Construct client connecting to Note server at {@code host:port}. */
	public NoteClient(String host, int port) {
		channel = ManagedChannelBuilder.forAddress(host, port)
				// Channels are secure by default (via SSL/TLS). For the example
				// we disable TLS to avoid
				// needing certificates.
				.usePlaintext(true).build();
		blockingStub = NoteServiceGrpc.newBlockingStub(channel);
	}

	public void shutdown() throws InterruptedException {
		channel.shutdown().awaitTermination(5, TimeUnit.SECONDS);
	}

	public void create() {
		Note request = Note.newBuilder().setTitle("Note1").setContent("My Note").build();
		Note response;
		try {
			response = blockingStub.create(request);
		} catch (StatusRuntimeException e) {
			logger.log(Level.WARNING, "RPC failed: {0}", e.getStatus());
			return;
		}
		logger.info("Note created: " + response);
	}

	/**
	 * Greet server. If provided, the first element of {@code args} is the name
	 * to use in the note.
	 */
	public static void main(String[] args) throws Exception {
		NoteClient client = new NoteClient("localhost", 50051);
		try {
			client.create();
		} finally {
			client.shutdown();
		}
	}
}