package com.ibm.apiconnect.demo.polyglot;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Iterator;

import com.github.kristofa.brave.Brave;
import com.github.kristofa.brave.EmptySpanCollectorMetricsHandler;
import com.github.kristofa.brave.Sampler;
import com.github.kristofa.brave.grpc.BraveGrpcServerInterceptor;
import com.github.kristofa.brave.http.HttpSpanCollector;

import io.grpc.BindableService;
import io.grpc.ServerInterceptors;
import io.grpc.ServerServiceDefinition;

public class BraveUtil {
	public static final String ZIPKIN_SERVER_URL = "http://zipkin:9411";

	private static Collection<HttpSpanCollector> collectors = Collections
			.synchronizedList(new ArrayList<HttpSpanCollector>());

	public static Brave brave(String serviceName, String zipkinBaseUrl) {
		HttpSpanCollector spanCollector = HttpSpanCollector.create(zipkinBaseUrl,
				new EmptySpanCollectorMetricsHandler());
		collectors.add(spanCollector);
		return new Brave.Builder(serviceName).traceSampler(Sampler.ALWAYS_SAMPLE).spanCollector(spanCollector).build();
	}

	public static ServerServiceDefinition intercept(BindableService service, String name, String zipkinBaseUrl) {
		if (zipkinBaseUrl == null) {
			zipkinBaseUrl = ZIPKIN_SERVER_URL;
		}
		return ServerInterceptors.intercept(service, new BraveGrpcServerInterceptor(brave(name, zipkinBaseUrl)));
	}

	public static void shutdown() {
		Iterator<HttpSpanCollector> it = collectors.iterator();
		while (it.hasNext()) {
			it.next().close();
		}
	}
}
