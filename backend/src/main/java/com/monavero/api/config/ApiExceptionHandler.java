package com.monavero.api.config;

import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    /** Mantém os códigos e motivos das regras bancárias sem redirecionar para /error. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleBusinessRule(ResponseStatusException ex) {
        String message = ex.getReason() == null || ex.getReason().isBlank()
            ? "Não foi possível concluir a operação." : ex.getReason();
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(ex.getStatusCode(), message);
        problem.setTitle("Operação não permitida");
        return ResponseEntity.status(ex.getStatusCode()).body(problem);
    }


    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintConflict(DataIntegrityViolationException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
            HttpStatus.CONFLICT, "Não foi possível concluir a operação.");
        detail.setTitle("Conflito de dados");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(detail);
    }

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
