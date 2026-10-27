package com.monavero.api.config;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleInvalidRequest(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "Os dados enviados não passaram pela validação."
        );
        problem.setTitle("Requisição inválida");
        List<String> fields = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField())
            .distinct()
            .sorted()
            .toList();
        problem.setProperty("invalidFields", fields);
        return ResponseEntity.badRequest().body(problem);
    }
}
