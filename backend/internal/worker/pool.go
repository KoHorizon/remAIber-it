// worker/pool.go
package worker

type Job[T any] func() T

type Result[T any] struct {
    JobID  string
    Output T
}

type Pool[T any] struct {
    jobs    chan jobWrapper[T]
    results chan Result[T]
}

type jobWrapper[T any] struct {
    id string
    fn Job[T]
}

func NewPool[T any](workerCount int, bufferSize int) *Pool[T] {
    p := &Pool[T]{
        jobs:    make(chan jobWrapper[T], bufferSize),
        results: make(chan Result[T], bufferSize),
    }

    for i := 0; i < workerCount; i++ {
        go p.worker()
    }

    return p
}

func (p *Pool[T]) worker() {
    for job := range p.jobs {
        output := job.fn()
        p.results <- Result[T]{
            JobID:  job.id,
            Output: output,
        }
    }
}

func (p *Pool[T]) Submit(id string, fn Job[T]) {
    p.jobs <- jobWrapper[T]{id: id, fn: fn}
}

func (p *Pool[T]) Results() <-chan Result[T] {
    return p.results
}