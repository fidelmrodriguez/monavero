package com.monavero.api;

import org.springframework.boot.SpringApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableScheduling
public class MonaveroApiApplication {
    public static void main(String[] args) {
        SpringApplication.run(MonaveroApiApplication.class, args);
    }
}
