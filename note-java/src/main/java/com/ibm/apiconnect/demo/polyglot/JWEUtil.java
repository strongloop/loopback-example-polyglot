package com.ibm.apiconnect.demo.polyglot;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.logging.Logger;

import com.nimbusds.jose.EncryptionMethod;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWEAlgorithm;
import com.nimbusds.jose.JWEHeader;
import com.nimbusds.jose.crypto.RSADecrypter;
import com.nimbusds.jose.crypto.RSAEncrypter;
import com.nimbusds.jose.crypto.bc.BouncyCastleProviderSingleton;
import com.nimbusds.jwt.EncryptedJWT;
import com.nimbusds.jwt.JWTClaimsSet;

public class JWEUtil {
	private static final Logger logger = Logger.getLogger(JWEUtil.class.getName());
	
	/**
	 * Load the private key
	 * @return private key
	 * @throws Exception
	 */
	public static RSAPrivateKey loadPrivateKey() throws Exception {
		byte[] keyBytes = loadResource("/private_key.der");
		PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
		KeyFactory kf = KeyFactory.getInstance("RSA");
		return (RSAPrivateKey) kf.generatePrivate(spec);
	}
	
	/**
	 * Load the public key
	 * @return public key
	 * @throws Exception
	 */
	public static RSAPublicKey loadPublicKey() throws Exception {
		byte[] keyBytes = loadResource("/public_key.der");
		X509EncodedKeySpec spec = new X509EncodedKeySpec(keyBytes);
		KeyFactory kf = KeyFactory.getInstance("RSA");
		return (RSAPublicKey) kf.generatePublic(spec);
	}

	/**
	 * Load resources into bytes
	 * @param name Name of the resource
	 * @return Resource content
	 * @throws IOException
	 */
	private static byte[] loadResource(String name) throws IOException {
		InputStream is = JWEUtil.class.getResourceAsStream(name);
		ByteArrayOutputStream bos = new ByteArrayOutputStream();
		byte[] buffer = new byte[4096];
		int length = 0;
		while (length != -1) {
			length = is.read(buffer);
			if (length > 0) {
				bos.write(buffer, 0, length);
			}
		}
		is.close();
		byte[] keyBytes = bos.toByteArray();
		return keyBytes;
	}

	/**
	 * Generate an encrypted JWE 
	 * @param jti
	 * @param publicKey
	 * @return
	 * @throws Exception
	 */
	public static String generateJWE(String jti, RSAPublicKey publicKey) throws Exception {
		// Compose the JWT claims set
		String iss = "https://openid.net";
		String sub = "apiconnect";
		List<String> aud = new ArrayList<String>();
		aud.add("https://app-one.com");
		aud.add("https://app-two.com");
		final Date NOW = new Date(new Date().getTime() / 1000 * 1000);
		Date exp = new Date(NOW.getTime() + 1000 * 60 * 10);
		Date nbf = NOW;
		Date iat = NOW;

		JWTClaimsSet jwtClaims = new JWTClaimsSet.Builder().issuer(iss).subject(sub).audience(aud).expirationTime(exp)
				.notBeforeTime(nbf).issueTime(iat).jwtID(jti).build();

		// Request JWT encrypted with RSA-OAEP and 128-bit AES/GCM
		JWEHeader header = new JWEHeader(JWEAlgorithm.RSA_OAEP, EncryptionMethod.A128GCM);

		// Create the encrypted JWT object
		EncryptedJWT jwt = new EncryptedJWT(header, jwtClaims);

		// Create an encrypter with the specified public RSA key
		RSAEncrypter encrypter = new RSAEncrypter(publicKey);
		encrypter.getJCAContext().setProvider(BouncyCastleProviderSingleton.getInstance());

		// Do the actual encryption
		jwt.encrypt(encrypter);

		// Serialize to JWT compact form
		String jwtString = jwt.serialize();
		
		return jwtString;
	}

	/**
	 * Decrypt the JWT
	 * @param jwtString
	 * @param privateKey
	 * @throws ParseException
	 * @throws JOSEException
	 */
	public static String decrypt(String jwtString, RSAPrivateKey privateKey) throws ParseException, JOSEException {
		EncryptedJWT jwt;
		// Parse back
		jwt = EncryptedJWT.parse(jwtString);

		// Create an decrypter with the specified private RSA key
		RSADecrypter decrypter = new RSADecrypter(privateKey);
		decrypter.getJCAContext().setProvider(BouncyCastleProviderSingleton.getInstance());

		// Decrypt
		jwt.decrypt(decrypter);

		// Retrieve JWT claims
		logger.info(jwt.getJWTClaimsSet().getIssuer());
		logger.info(jwt.getJWTClaimsSet().getSubject());
		logger.info(jwt.getJWTClaimsSet().getAudience().toString());
		logger.info(jwt.getJWTClaimsSet().getExpirationTime().toString());
		logger.info(jwt.getJWTClaimsSet().getNotBeforeTime().toString());
		logger.info(jwt.getJWTClaimsSet().getIssueTime().toString());
		logger.info(jwt.getJWTClaimsSet().getJWTID());
		
		return jwt.getJWTClaimsSet().getJWTID();
	}
	
	public static void main(String[] args) throws Exception {
		RSAPrivateKey privateKey = JWEUtil.loadPrivateKey();
		RSAPublicKey publicKey = JWEUtil.loadPublicKey();
		String jwe = JWEUtil.generateJWE("Hello", publicKey);
		logger.info(jwe);
		JWEUtil.decrypt(jwe, privateKey);
	}
}
