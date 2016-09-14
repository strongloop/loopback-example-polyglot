package com.ibm.apiconnect.demo.polyglot;

import com.github.kristofa.brave.Brave;
import com.github.kristofa.brave.EmptySpanCollectorMetricsHandler;
import com.github.kristofa.brave.Sampler;
import com.github.kristofa.brave.grpc.BraveGrpcServerInterceptor;
import com.github.kristofa.brave.http.HttpSpanCollector;

import io.grpc.BindableService;
import io.grpc.ServerInterceptors;
import io.grpc.ServerServiceDefinition;

public class BraveUtil {
	public static final String ZIPKIN_SERVER_URL = "http://localhost:9411";

	public static Brave brave(String serviceName, String zipkinBaseUrl) {
		return new Brave.Builder(serviceName).traceSampler(Sampler.ALWAYS_SAMPLE)
				.spanCollector(HttpSpanCollector.create(zipkinBaseUrl, new EmptySpanCollectorMetricsHandler())).build();
	}

	public static ServerServiceDefinition intercept(BindableService service, String name, String zipkinBaseUrl) {
		if (zipkinBaseUrl == null) {
			zipkinBaseUrl = ZIPKIN_SERVER_URL;
		}
		return ServerInterceptors.intercept(service, new BraveGrpcServerInterceptor(brave(name, zipkinBaseUrl)));
	}
}
